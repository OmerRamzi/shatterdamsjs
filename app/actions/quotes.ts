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

// Generate Auto-Increment Quote Number (Format: QT-YYYY-0001)
async function generateQuoteNumber(tenantId: number) {
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;
  
  const { data: latest } = await supabase
    .from("quotations")
    .select("quoteNumber")
    .eq("tenantId", tenantId)
    .order("id", { ascending: false })
    .limit(1);

  let sequence = 1;
  if (latest && latest.length > 0 && latest[0].quoteNumber.startsWith(prefix)) {
    const lastSeq = parseInt(latest[0].quoteNumber.split("-")[2], 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

export async function getQuotes() {
  const user = await requireAdmin();
  
  const { data } = await supabase
    .from("quotations")
    .select(`
      *,
      client:clients(*)
    `)
    .eq("tenantId", user.tenantId)
    .order("createdAt", { ascending: false });
    
  return (data || []).map(row => {
    const { client, ...quoteData } = row;
    return {
      quote: quoteData,
      client: client
    };
  });
}

export async function createQuote(data: {
  clientId: number;
  validUntil?: Date;
  notes?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
}) {
  const admin = await requireAdmin();

  const quoteNumber = await generateQuoteNumber(admin.tenantId);
  
  const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const total = subtotal;

  const { data: newQuote, error: quoteError } = await supabase.from("quotations").insert({
    tenantId: admin.tenantId,
    clientId: data.clientId,
    quoteNumber,
    issueDate: new Date().toISOString(),
    subtotal: subtotal.toString(),
    tax: "0",
    total: total.toString(),
    status: "draft",
    validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    notes: data.notes,
    createdBy: parseInt(admin.id as string),
  }).select("id").single();

  if (quoteError || !newQuote) throw new Error(quoteError?.message || "Failed to create quote");
  const quotationId = newQuote.id;

  for (const item of data.items) {
    await supabase.from("quotation_items").insert({
      quotationId,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      amount: (item.quantity * item.unitPrice).toString(),
    });
  }

  await supabase.from("activity_logs").insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.id as string),
    action: `Quotation ${quoteNumber} created.`,
  });

  revalidatePath("/admin/quotes");
  return { success: true, quoteId: quotationId };
}

export async function getQuoteDetails(quoteId: number) {
  const session = await auth();
  if (!session || !session.user) throw new Error("Unauthorized");

  const { data: quoteList, error } = await supabase
    .from("quotations")
    .select(`
      *,
      client:clients(*)
    `)
    .eq("id", quoteId)
    .limit(1);

  if (error || !quoteList || quoteList.length === 0) throw new Error("Quote not found");
  
  const row = quoteList[0];
  if (row.tenantId !== session.user.tenantId) throw new Error("Unauthorized");

  // Client isolation
  if (session.user.role === "client") {
    const { data: clientRecord } = await supabase.from("clients").select("*").eq("userId", session.user.id).limit(1);
    if (!clientRecord || clientRecord.length === 0 || row.clientId !== clientRecord[0].id) {
      throw new Error("Unauthorized");
    }
  }

  const { data: items } = await supabase.from("quotation_items").select("*").eq("quotationId", quoteId);

  const { client, ...quoteData } = row;
  return {
    quote: quoteData,
    client: client,
    items: items || []
  };
}

export async function sendQuoteEmail(quoteId: number) {
  const admin = await requireAdmin();
  
  const details = await getQuoteDetails(quoteId);
  const clientEmail = details.client?.email;
  
  if (!clientEmail) throw new Error("Client has no email address");

  await resend.emails.send({
    from: "Shatter DAMS Sales <hello@mailer.meetshatter.com>",
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

  await supabase.from("quotations").update({ status: "sent" }).eq("id", quoteId);

  await supabase.from("activity_logs").insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.id as string),
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
  
  await supabase.from("quotations").update({ status: "accepted" }).eq("id", quoteId);

  await supabase.from("activity_logs").insert({
    tenantId: session.user.tenantId,
    userId: parseInt(session.user.id as string),
    action: `Quotation ${details.quote.quoteNumber} accepted.`,
  });

  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${quoteId}`);
  return { success: true };
}
