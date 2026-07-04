"use server";

import { supabase } from "@/db/supabase";
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
  
  const { data: latest } = await supabase
    .from("invoices")
    .select("invoiceNumber")
    .eq("tenantId", tenantId)
    .order("id", { ascending: false })
    .limit(1);

  let sequence = 1;
  if (latest && latest.length > 0 && latest[0].invoiceNumber.startsWith(prefix)) {
    const lastSeq = parseInt(latest[0].invoiceNumber.split("-")[2], 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

export async function getInvoices() {
  const user = await requireAdmin();
  
  const { data } = await supabase
    .from("invoices")
    .select(`
      *,
      client:clients(*),
      project:projects(*)
    `)
    .eq("tenantId", user.tenantId)
    .order("createdAt", { ascending: false });
    
  return (data || []).map(row => {
    const { client, project, ...invoiceData } = row;
    return {
      invoice: invoiceData,
      client: client,
      project: project
    };
  });
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
  const total = subtotal;

  // Insert Invoice
  const { data: newInvoice, error: invError } = await supabase.from("invoices").insert({
    tenantId: admin.tenantId,
    clientId: data.clientId,
    projectId: data.projectId,
    invoiceNumber,
    issueDate: new Date().toISOString(),
    dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    subtotal: subtotal.toString(),
    tax: "0",
    total: total.toString(),
    status: "draft",
    notes: data.notes,
    createdBy: parseInt(admin.id as string),
  }).select("id").single();

  if (invError || !newInvoice) throw new Error(invError?.message || "Failed to create invoice");
  const invoiceId = newInvoice.id;

  // Insert Items
  for (const item of data.items) {
    await supabase.from("invoice_items").insert({
      invoiceId,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      amount: (item.quantity * item.unitPrice).toString(),
    });
  }

  await supabase.from("activity_logs").insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.id as string),
    action: `Invoice ${invoiceNumber} created.`,
  });

  revalidatePath("/admin/invoices");
  return { success: true, invoiceId };
}

export async function getInvoiceDetails(invoiceId: number) {
  const session = await auth();
  if (!session || !session.user) throw new Error("Unauthorized");

  const { data: invoiceList, error } = await supabase
    .from("invoices")
    .select(`
      *,
      client:clients(*),
      project:projects(*)
    `)
    .eq("id", invoiceId)
    .limit(1);

  if (error || !invoiceList || invoiceList.length === 0) throw new Error("Invoice not found");
  const row = invoiceList[0];
  
  if (row.tenantId !== session.user.tenantId) throw new Error("Unauthorized");

  // Client isolation
  if (session.user.role === "client") {
    const { data: clientRecord } = await supabase.from("clients").select("*").eq("userId", session.user.id).limit(1);
    if (!clientRecord || clientRecord.length === 0 || row.clientId !== clientRecord[0].id) {
      throw new Error("Unauthorized");
    }
  }

  const { data: items } = await supabase.from("invoice_items").select("*").eq("invoiceId", invoiceId);

  const { client, project, ...invoiceData } = row;
  return {
    invoice: invoiceData,
    client: client,
    project: project,
    items: items || []
  };
}

export async function sendInvoiceEmail(invoiceId: number) {
  const admin = await requireAdmin();
  
  const details = await getInvoiceDetails(invoiceId);
  const clientEmail = details.client?.email;
  
  if (!clientEmail) throw new Error("Client has no email address");

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

  await supabase.from("invoices").update({ status: "sent" }).eq("id", invoiceId);

  await supabase.from("activity_logs").insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.id as string),
    action: `Invoice ${details.invoice.invoiceNumber} sent to client.`,
  });

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  return { success: true };
}

export async function markInvoicePaid(invoiceId: number) {
  const admin = await requireAdmin();
  const details = await getInvoiceDetails(invoiceId);
  
  await supabase.from("invoices").update({ status: "paid" }).eq("id", invoiceId);

  await supabase.from("activity_logs").insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.id as string),
    action: `Invoice ${details.invoice.invoiceNumber} marked as paid.`,
  });

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  return { success: true };
}
