"use server";

import { db } from "@/db";
import { users, userRoles, activityLogs } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
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
  
  // Get all users in this tenant except clients
  const allRoles = await db.select().from(userRoles);
  const teamUserIds = allRoles
    .filter(r => r.role === "employee" || r.role === "freelancer" || r.role === "administrator")
    .map(r => r.userId);

  if (teamUserIds.length === 0) return [];

  const team = await db.select().from(users).where(inArray(users.id, teamUserIds));
  
  return team.map(u => {
    const role = allRoles.find(r => r.userId === u.id)?.role;
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

  const newUser = await db.insert(users).values({
    tenantId: admin.tenantId,
    email: data.email,
    passwordHash,
    displayName: data.displayName,
    phone: data.phone,
    preferredLocale: "en",
  }).returning({ id: users.id });

  const userId = newUser[0].id;

  await db.insert(userRoles).values({
    userId,
    role: data.role,
  });

  await db.insert(activityLogs).values({
    tenantId: admin.tenantId,
    userId: parseInt(admin.id),
    action: `Team member '${data.displayName}' added as ${data.role}.`,
  });

  revalidatePath("/admin/team");
  return { success: true };
}
