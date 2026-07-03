"use server";

import { db } from "@/db";
import { quotations, quotationItems, clients, projects, activityLogs } from "@/db/schema";
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

// Generate Auto-Increment Quote Number (Format: QT-YYYY-0001)
async function generateQuoteNumber(tenantId: number) {
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;
  
  const latest = await db.select({ quoteNumber: quotations.quoteNumber })
    .from(quotations)
    .where(eq(quotations.tenantId, tenantId))
    .orderBy(desc(quotations.id))
    .limit(1);

  let sequence = 1;
  if (latest.length > 0 && latest[0].quoteNumber.startsWith(prefix)) {
    const lastSeq = parseInt(latest[0].quoteNumber.split("-")[2], 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

export async function getQuotes() {
  const user = await requireAdmin();
  
  const results = await db.select({
    quote: quotations,
    client: clients,
    project: projects
  })
    .from(quotations)
    .leftJoin(clients, eq(quotations.clientId, clients.id))
    .leftJoin(projects, eq(quotations.projectId, projects.id))
    .where(eq(quotations.tenantId, user.tenantId))
    .orderBy(desc(quotations.createdAt));
    
  return results;
}

export async function createQuote(data: {
  clientId: number;
  projectId?: number;
  validUntil?: Date;
  notes?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
}) {
  const admin = await requireAdmin();

  const quoteNumber = await generateQuoteNumber(admin.tenantId);
  
  const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const total = subtotal;

  const newQuote = await db.insert(quotations).values({
    tenantId: admin.tenantId,
    clientId: data.clientId,
    projectId: data.projectId,
    quoteNumber,
    issueDate: new Date().toISOString(),
    subtotal: subtotal.toString(),
    tax: "0",
    total: total.toString(),
    status: "draft",
    validUntil: data.validUntil ? data.validUntil.toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    notes: data.notes,
    createdBy: parseInt(admin.id),
  }).returning({ id: quotations.id });

  const quotationId = newQuote[0].id;

  for (const item of data.items) {
    await db.insert(quotationItems).values({
      quotationId,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      amount: (item.quantity * item.unitPrice).toString(),
    });
  }

  await db.insert(activityLogs).values({
    tenantId: admin.tenantId,
    userId: parseInt(admin.id),
    action: `Quotation ${quoteNumber} created.`,
  });

  revalidatePath("/admin/quotes");
  return { success: true, quoteId: quotationId };
}

export async function getQuoteDetails(quoteId: number) {
  const session = await auth();
  if (!session || !session.user) throw new Error("Unauthorized");

  const quoteList = await db.select({
    quote: quotations,
    client: clients,
    project: projects
  })
    .from(quotations)
    .leftJoin(clients, eq(quotations.clientId, clients.id))
    .leftJoin(projects, eq(quotations.projectId, projects.id))
    .where(eq(quotations.id, quoteId))
    .limit(1);

  if (!quoteList[0]) throw new Error("Quote not found");
  if (quoteList[0].quote.tenantId !== session.user.tenantId) throw new Error("Unauthorized");

  // Client isolation
  if (session.user.role === "client") {
    const clientRecord = await db.select().from(clients).where(eq(clients.userId, parseInt(session.user.id))).limit(1);
    if (!clientRecord[0] || quoteList[0].quote.clientId !== clientRecord[0].id) {
      throw new Error("Unauthorized");
    }
  }

  const items = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, quoteId));

  return { ...quoteList[0], items };
}

export async function sendQuoteEmail(quoteId: number) {
  const admin = await requireAdmin();
  
  const details = await getQuoteDetails(quoteId);
  const clientEmail = details.client?.email;
  
  if (!clientEmail) throw new Error("Client has no email address");

  await resend.emails.send({
    from: "Shatter DAMS Sales <no-reply@meetshatter.com>",
    to: [clientEmail],
    subject: `Quotation ${details.quote.quoteNumber} from Shatter`,
    html: `
      <h2>Quotation ${details.quote.quoteNumber}</h2>
      <p>Dear ${details.client?.contactPerson || details.client?.companyName},</p>
      <p>We have prepared a new quotation for you for the amount of <strong>$${details.quote.total}</strong>.</p>
      <p>Please log in to your portal to review and accept the quotation.</p>
      <p><strong>Portal Login:</strong> https://client.meetshatter.com/login</p>
      <br/>
      <p>Thank you!</p>
    `,
  });

  await db.update(quotations).set({ status: "sent" }).where(eq(quotations.id, quoteId));

  await db.insert(activityLogs).values({
    tenantId: admin.tenantId,
    userId: parseInt(admin.id),
    action: `Quotation ${details.quote.quoteNumber} sent to client.`,
  });

  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${quoteId}`);
  return { success: true };
}

export async function acceptQuote(quoteId: number) {
  const session = await auth();
  if (!session || !session.user) throw new Error("Unauthorized");
  
  const details = await getQuoteDetails(quoteId);
  
  await db.update(quotations).set({ status: "accepted" }).where(eq(quotations.id, quoteId));

  await db.insert(activityLogs).values({
    tenantId: session.user.tenantId,
    userId: parseInt(session.user.id),
    action: `Quotation ${details.quote.quoteNumber} accepted.`,
  });

  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${quoteId}`);
  return { success: true };
}
