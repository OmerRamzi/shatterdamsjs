"use server";

import { db } from "@/db";
import { invoices, invoiceItems, clients, projects, activityLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

async function requireAdmin() {
  const session = await auth();
  if (!session || !session.user || session.user.role !== "administrator") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// Generate Auto-Increment Invoice Number (Format: INV-YYYY-0001)
async function generateInvoiceNumber(tenantId: number) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  // Find the latest invoice for this year
  const latest = await db.select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(eq(invoices.tenantId, tenantId))
    .orderBy(desc(invoices.id))
    .limit(1);

  let sequence = 1;
  if (latest.length > 0 && latest[0].invoiceNumber.startsWith(prefix)) {
    const lastSeq = parseInt(latest[0].invoiceNumber.split("-")[2], 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

export async function getInvoices() {
  const user = await requireAdmin();
  
  const results = await db.select({
    invoice: invoices,
    client: clients,
    project: projects
  })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(projects, eq(invoices.projectId, projects.id))
    .where(eq(invoices.tenantId, user.tenantId))
    .orderBy(desc(invoices.createdAt));
    
  return results;
}

export async function createInvoice(data: {
  clientId: number;
  projectId?: number;
  dueDate?: Date;
  notes?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
}) {
  const admin = await requireAdmin();

  const invoiceNumber = await generateInvoiceNumber(admin.tenantId);
  
  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const total = subtotal; // Assuming no tax logic yet, or add if needed

  // Insert Invoice
  const newInvoice = await db.insert(invoices).values({
    tenantId: admin.tenantId,
    clientId: data.clientId,
    projectId: data.projectId,
    invoiceNumber,
    issueDate: new Date().toISOString(),
    dueDate: data.dueDate ? data.dueDate.toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    subtotal: subtotal.toString(),
    tax: "0",
    total: total.toString(),
    status: "draft",
    notes: data.notes,
    createdBy: parseInt(admin.id),
  }).returning({ id: invoices.id });

  const invoiceId = newInvoice[0].id;

  // Insert Items
  for (const item of data.items) {
    await db.insert(invoiceItems).values({
      invoiceId,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      amount: (item.quantity * item.unitPrice).toString(),
    });
  }

  await db.insert(activityLogs).values({
    tenantId: admin.tenantId,
    userId: parseInt(admin.id),
    action: `Invoice ${invoiceNumber} created.`,
  });

  revalidatePath("/admin/invoices");
  return { success: true, invoiceId };
}

export async function getInvoiceDetails(invoiceId: number) {
  const session = await auth();
  if (!session || !session.user) throw new Error("Unauthorized");

  const invoiceList = await db.select({
    invoice: invoices,
    client: clients,
    project: projects
  })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(projects, eq(invoices.projectId, projects.id))
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!invoiceList[0]) throw new Error("Invoice not found");
  
  // Basic tenant safety
  if (invoiceList[0].invoice.tenantId !== session.user.tenantId) throw new Error("Unauthorized");

  // Client isolation
  if (session.user.role === "client") {
    const clientRecord = await db.select().from(clients).where(eq(clients.userId, parseInt(session.user.id))).limit(1);
    if (!clientRecord[0] || invoiceList[0].invoice.clientId !== clientRecord[0].id) {
      throw new Error("Unauthorized");
    }
  }

  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));

  return { ...invoiceList[0], items };
}

export async function sendInvoiceEmail(invoiceId: number) {
  const admin = await requireAdmin();
  
  const details = await getInvoiceDetails(invoiceId);
  const clientEmail = details.client?.email;
  
  if (!clientEmail) throw new Error("Client has no email address");

  // Send Email
  await resend.emails.send({
    from: "Shatter DAMS Billing <hello@mailer.meetshatter.com>",
    to: [clientEmail],
    subject: `Invoice ${details.invoice.invoiceNumber} from Shatter`,
    html: `
      <h2>Invoice ${details.invoice.invoiceNumber}</h2>
      <p>Dear ${details.client?.contactPerson || details.client?.companyName},</p>
      <p>A new invoice has been generated for your account for the amount of <strong>$${details.invoice.total}</strong>.</p>
      <p>You can view and download your invoice securely by logging into your client portal.</p>
      <p><strong>Portal Login:</strong> https://client.meetshatter.com/login</p>
      <br/>
      <p>Thank you for your business!</p>
    `,
  });

  // Update Status
  await db.update(invoices).set({ status: "sent" }).where(eq(invoices.id, invoiceId));

  await db.insert(activityLogs).values({
    tenantId: admin.tenantId,
    userId: parseInt(admin.id),
    action: `Invoice ${details.invoice.invoiceNumber} sent to client.`,
  });

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  return { success: true };
}

export async function markInvoicePaid(invoiceId: number) {
  const admin = await requireAdmin();
  const details = await getInvoiceDetails(invoiceId);
  
  await db.update(invoices).set({ status: "paid" }).where(eq(invoices.id, invoiceId));

  await db.insert(activityLogs).values({
    tenantId: admin.tenantId,
    userId: parseInt(admin.id),
    action: `Invoice ${details.invoice.invoiceNumber} marked as paid.`,
  });

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  return { success: true };
}
