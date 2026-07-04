"use server";

import { supabase } from "@/db/supabase";
import { auth } from "@/auth";

export async function getGlobalActivityLogs(limit: number = 10) {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const { data } = await supabase
    .from("activity_logs")
    .select(`
      id,
      action,
      createdAt,
      user:users (
        id,
        displayName
      )
    `)
    .eq("tenantId", session.user.tenantId)
    .order("createdAt", { ascending: false })
    .limit(limit);

  return (data || []).map(row => ({
    id: row.id,
    action: row.action,
    createdAt: row.createdAt,
    // Supabase returns related objects as an array or object depending on relation, usually object for many-to-one
    user: Array.isArray(row.user) ? row.user[0] : row.user
  }));
}
