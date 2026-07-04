"use server";

import { supabase } from "@/db/supabase";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

// Helper to check admin access
async function requireAdmin() {
  const session = await auth();
  if (!session || !session.user || session.user.role !== "administrator") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function getClients() {
  const user = await requireAdmin();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("tenantId", user.tenantId);
    
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createClient(data: {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}) {
  const admin = await requireAdmin();

  // Create Client Profile
  const { error: insertError } = await supabase.from("clients").insert({
    tenantId: admin.tenantId,
    companyName: data.companyName,
    contactPerson: data.contactPerson,
    email: data.email,
    phone: data.phone,
    address: data.address,
    city: data.city,
    country: data.country || "Sri Lanka",
    status: "active",
  });
  if (insertError) throw new Error(insertError.message);

  // Log Activity
  await supabase.from("activity_logs").insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.id as string),
    action: `Client '${data.companyName}' added (Unactivated).`,
  });

  revalidatePath("/admin/clients");
  return { success: true };
}

export async function activateClient(clientId: number) {
  const admin = await requireAdmin();

  // Get Client
  const { data: clientList, error: getError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .limit(1);

  if (getError || !clientList || clientList.length === 0) throw new Error("Client not found");
  const client = clientList[0];

  if (client.userId) throw new Error("Client is already activated");

  // Generate secure random password
  const randomPassword = Math.random().toString(36).slice(-8) + "Aa1@";
  const passwordHash = await bcrypt.hash(randomPassword, 10);

  // 1. Create User
  const { data: newUser, error: userError } = await supabase.from("users").insert({
    tenantId: admin.tenantId,
    email: client.email,
    passwordHash,
    displayName: client.contactPerson || client.companyName,
    preferredLocale: "en",
  }).select("id").single();
  
  if (userError || !newUser) throw new Error(userError.message || "Failed to create user");

  const userId = newUser.id;

  // 2. Assign Role 'client'
  await supabase.from("user_roles").insert({
    userId,
    role: "client",
  });

  // 3. Update Client Profile
  await supabase.from("clients").update({ userId }).eq("id", clientId);

  // 4. Send Email via Resend
  await resend.emails.send({
    from: "Shatter DAMS <hello@mailer.meetshatter.com>",
    to: [client.email],
    subject: "Your Shatter DAMS Client Portal Access",
    html: `
      <h2>Welcome to your Client Portal</h2>
      <p>Your account has been activated. You can now log in to view your projects and files.</p>
      <p><strong>Login URL:</strong> https://client.meetshatter.com/login</p>
      <p><strong>Email:</strong> ${client.email}</p>
      <p><strong>Password:</strong> ${randomPassword}</p>
      <br/>
      <p>Please change your password upon logging in.</p>
    `,
  });

  // 5. Log Activity
  await supabase.from("activity_logs").insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.id as string),
    action: `Client '${client.companyName}' account activated and credentials emailed.`,
  });

  revalidatePath("/admin/clients");
  return { success: true };
}

export async function deleteClient(clientId: number) {
  const admin = await requireAdmin();
  
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) throw new Error(error.message);
  
  await supabase.from("activity_logs").insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.id as string),
    action: `Client ID ${clientId} deleted.`,
  });

  revalidatePath("/admin/clients");
  return { success: true };
}
