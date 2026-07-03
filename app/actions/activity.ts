"use server";

import { db } from "@/db";
import { activityLogs, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/auth";

export async function getGlobalActivityLogs(limit: number = 10) {
  const session = await auth();
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const logs = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      createdAt: activityLogs.createdAt,
      user: {
        id: users.id,
        displayName: users.displayName,
      }
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.tenantId, session.user.tenantId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  return logs;
}
