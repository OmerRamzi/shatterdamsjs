"use server";

import { supabase } from "@/db/supabase";
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
  const { data } = await supabase.from("projects").select("*").eq("tenantId", user.tenantId);
  return data || [];
}

export async function createProject(data: {
  title: string;
  clientId: number;
  description: string;
  budget: string;
  deadline: string;
}) {
  const user = await requireAuth();

  await supabase.from("projects").insert({
    tenantId: user.tenantId,
    clientId: data.clientId,
    title: data.title,
    description: data.description,
    budget: data.budget,
    deadline: data.deadline,
    createdBy: parseInt(user.id as string),
    status: "active",
    priority: "medium",
  });

  await supabase.from("activity_logs").insert({
    tenantId: user.tenantId,
    userId: parseInt(user.id as string),
    action: `Project '${data.title}' created.`,
  });

  revalidatePath("/admin/projects");
  revalidatePath("/team/projects");
  return { success: true };
}
