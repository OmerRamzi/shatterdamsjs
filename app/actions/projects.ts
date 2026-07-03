"use server";

import { db } from "@/db";
import { projects, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function getProjects() {
  const user = await requireAuth();
  return await db.select().from(projects).where(eq(projects.tenantId, user.tenantId));
}

export async function createProject(data: {
  title: string;
  clientId: number;
  description: string;
  budget: string;
  deadline: string;
}) {
  const user = await requireAuth();

  await db.insert(projects).values({
    tenantId: user.tenantId,
    clientId: data.clientId,
    title: data.title,
    description: data.description,
    budget: data.budget,
    deadline: data.deadline,
    createdBy: parseInt(user.id),
    status: "active",
    priority: "medium",
  });

  await db.insert(activityLogs).values({
    tenantId: user.tenantId,
    userId: parseInt(user.id),
    action: `Project '${data.title}' created.`,
  });

  revalidatePath("/admin/projects");
  revalidatePath("/team/projects");
  return { success: true };
}
