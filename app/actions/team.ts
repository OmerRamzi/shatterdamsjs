"use server";

import { supabase } from "@/db/supabase";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await auth();
  if (!session || !session.user || session.user.role !== "administrator") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function getTeamMembers() {
  const admin = await requireAdmin();
  
  const { data: allRoles } = await supabase.from("user_roles").select("*");
  const roles = allRoles || [];

  const teamUserIds = roles
    .filter(r => r.role === "employee" || r.role === "freelancer" || r.role === "administrator")
    .map(r => r.userId);

  if (teamUserIds.length === 0) return [];

  const { data: team } = await supabase.from("users").select("*").in("id", teamUserIds);
  
  return (team || []).map(u => {
    const role = roles.find(r => r.userId === u.id)?.role;
    return { ...u, role };
  });
}

export async function createTeamMember(data: {
  displayName: string;
  email: string;
  phone: string;
  role: "employee" | "freelancer" | "administrator";
}) {
  const admin = await requireAdmin();

  // Default password
  const defaultPassword = "Team@123";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const { data: newUser, error: userError } = await supabase.from("users").insert({
    tenantId: admin.tenantId,
    email: data.email,
    passwordHash,
    displayName: data.displayName,
    phone: data.phone,
    preferredLocale: "en",
  }).select("id").single();

  if (userError || !newUser) throw new Error(userError?.message || "Failed to create user");
  const userId = newUser.id;

  await supabase.from("user_roles").insert({
    userId,
    role: data.role,
  });

  await supabase.from("activity_logs").insert({
    tenantId: admin.tenantId,
    userId: parseInt(admin.id as string),
    action: `Team member '${data.displayName}' added as ${data.role}.`,
  });

  revalidatePath("/admin/team");
  return { success: true };
}
