"use server";

import { db } from "@/db";
import { projects, clients, projectTeam, files } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { auth } from "@/auth";

// --- CLIENT PORTAL ACTIONS ---

async function requireClient() {
  const session = await auth();
  if (!session || !session.user || session.user.role !== "client") throw new Error("Unauthorized");
  return session.user;
}

export async function getClientProjects() {
  const user = await requireClient();
  
  // Find the client record associated with this user
  const clientRecord = await db.select().from(clients).where(eq(clients.userId, parseInt(user.id))).limit(1);
  if (!clientRecord[0]) return [];

  return await db.select().from(projects).where(eq(projects.clientId, clientRecord[0].id)).orderBy(desc(projects.createdAt));
}

export async function getClientProjectDetails(projectId: number) {
  const user = await requireClient();
  
  const clientRecord = await db.select().from(clients).where(eq(clients.userId, parseInt(user.id))).limit(1);
  if (!clientRecord[0]) throw new Error("Unauthorized");

  const projectList = await db.select().from(projects)
    .where(and(
      eq(projects.id, projectId),
      eq(projects.clientId, clientRecord[0].id)
    )).limit(1);

  if (!projectList[0]) throw new Error("Unauthorized");
  return projectList[0];
}

export async function getClientFiles(projectId: number) {
  // Verifies access inherently via getClientProjectDetails
  await getClientProjectDetails(projectId);

  // Clients only see files that are explicitly sent to client review or approved
  return await db.select().from(files)
    .where(and(
      eq(files.projectId, projectId),
      inArray(files.status, ['client_review', 'approved'])
    )).orderBy(desc(files.uploadedAt));
}


// --- TEAM PORTAL ACTIONS ---

async function requireTeam() {
  const session = await auth();
  if (!session || !session.user || !['employee', 'freelancer'].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function getTeamProjects() {
  const user = await requireTeam();
  
  // Find projects assigned to this user in project_team
  const assigned = await db.select({ projectId: projectTeam.projectId })
    .from(projectTeam)
    .where(eq(projectTeam.userId, parseInt(user.id)));

  if (assigned.length === 0) return [];

  const projectIds = assigned.map(a => a.projectId);

  return await db.select({
    project: projects,
    client: clients,
  })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(inArray(projects.id, projectIds))
    .orderBy(desc(projects.createdAt));
}

export async function getTeamProjectDetails(projectId: number) {
  const user = await requireTeam();
  
  const assigned = await db.select().from(projectTeam)
    .where(and(
      eq(projectTeam.projectId, projectId),
      eq(projectTeam.userId, parseInt(user.id))
    )).limit(1);

  if (!assigned[0]) throw new Error("Unauthorized: Not assigned to project");

  const projectList = await db.select({
    project: projects,
    client: clients,
  })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(projects.id, projectId))
    .limit(1);

  return projectList[0];
}

export async function getTeamFiles(projectId: number) {
  // Verifies access
  await getTeamProjectDetails(projectId);

  // Team members see all files for projects they are assigned to
  return await db.select().from(files)
    .where(eq(files.projectId, projectId))
    .orderBy(desc(files.uploadedAt));
}
