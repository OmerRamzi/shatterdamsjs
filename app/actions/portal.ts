"use server";

import { supabase } from "@/db/supabase";
import { auth } from "@/auth";

// --- CLIENT PORTAL ACTIONS ---

async function requireClient() {
  const session = await auth();
  if (!session || !session.user || session.user.role !== "client") throw new Error("Unauthorized");
  return session.user;
}

export async function getClientProjects() {
  const user = await requireClient();
  
  const { data: clientRecord } = await supabase.from("clients").select("*").eq("userId", user.id).limit(1);
  if (!clientRecord || clientRecord.length === 0) return [];

  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("clientId", clientRecord[0].id)
    .order("createdAt", { ascending: false });
    
  return data || [];
}

export async function getClientProjectDetails(projectId: number) {
  const user = await requireClient();
  
  const { data: clientRecord } = await supabase.from("clients").select("*").eq("userId", user.id).limit(1);
  if (!clientRecord || clientRecord.length === 0) throw new Error("Unauthorized");

  const { data: projectList } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("clientId", clientRecord[0].id)
    .limit(1);

  if (!projectList || projectList.length === 0) throw new Error("Unauthorized");
  return projectList[0];
}

export async function getClientFiles(projectId: number) {
  // Verifies access inherently via getClientProjectDetails
  await getClientProjectDetails(projectId);

  // Clients only see files that are explicitly sent to client review or approved
  const { data } = await supabase
    .from("files")
    .select("*")
    .eq("projectId", projectId)
    .in("status", ['client_review', 'approved'])
    .order("uploadedAt", { ascending: false });
    
  return data || [];
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
  
  const { data: assigned } = await supabase
    .from("project_team")
    .select("projectId")
    .eq("userId", user.id);

  if (!assigned || assigned.length === 0) return [];

  const projectIds = assigned.map(a => a.projectId);

  const { data } = await supabase
    .from("projects")
    .select(`
      *,
      client:clients(*)
    `)
    .in("id", projectIds)
    .order("createdAt", { ascending: false });

  return (data || []).map(row => {
    const { client, ...project } = row;
    return { project, client };
  });
}

export async function getTeamProjectDetails(projectId: number) {
  const user = await requireTeam();
  
  const { data: assigned } = await supabase
    .from("project_team")
    .select("*")
    .eq("projectId", projectId)
    .eq("userId", user.id)
    .limit(1);

  if (!assigned || assigned.length === 0) throw new Error("Unauthorized: Not assigned to project");

  const { data: projectList } = await supabase
    .from("projects")
    .select(`
      *,
      client:clients(*)
    `)
    .eq("id", projectId)
    .limit(1);

  if (!projectList || projectList.length === 0) throw new Error("Project not found");
  
  const row = projectList[0];
  const { client, ...project } = row;
  return { project, client };
}

export async function getTeamFiles(projectId: number) {
  await getTeamProjectDetails(projectId);

  const { data } = await supabase
    .from("files")
    .select("*")
    .eq("projectId", projectId)
    .order("uploadedAt", { ascending: false });
    
  return data || [];
}

// ==============================
// 3. Client Invoices & Quotes
// ==============================

export async function getClientInvoices() {
  const user = await requireClient();
  
  const { data: clientRecord } = await supabase.from("clients").select("*").eq("userId", user.id).limit(1);
  if (!clientRecord || clientRecord.length === 0) return [];

  const { data } = await supabase
    .from("invoices")
    .select(`
      *,
      project:projects(*)
    `)
    .eq("clientId", clientRecord[0].id)
    .order("createdAt", { ascending: false });

  return (data || []).map(row => {
    const { project, ...invoice } = row;
    return { invoice, project };
  });
}

export async function getClientQuotes() {
  const user = await requireClient();
  
  const { data: clientRecord } = await supabase.from("clients").select("*").eq("userId", user.id).limit(1);
  if (!clientRecord || clientRecord.length === 0) return [];

  const { data } = await supabase
    .from("quotations")
    .select("*")
    .eq("clientId", clientRecord[0].id)
    .order("createdAt", { ascending: false });

  return (data || []).map(quote => ({ quote }));
}
