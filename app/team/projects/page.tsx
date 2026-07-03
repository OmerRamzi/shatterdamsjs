import { getTeamProjects } from "@/app/actions/portal";
import { FolderGit2, Calendar } from "lucide-react";
import Link from "next/link";

export default async function TeamProjectsPage() {
  const projectsData = await getTeamProjects();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Projects</h2>
        <p className="text-muted-foreground mt-1">Projects you are actively assigned to.</p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Project</th>
                <th className="px-6 py-4 font-medium">Client</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projectsData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <FolderGit2 className="w-8 h-8 mb-2 opacity-50" />
                      <p>You have no assigned projects.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                projectsData.map(({ project, client }) => (
                  <tr key={project.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/team/projects/${project.id}`} className="font-medium hover:text-primary transition-colors">
                        {project.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{client?.companyName}</td>
                    <td className="px-6 py-4">
                      <span className="capitalize px-2 py-1 bg-secondary rounded-full text-xs font-medium">
                        {project.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'None'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
