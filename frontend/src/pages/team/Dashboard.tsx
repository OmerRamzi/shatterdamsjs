import { useState, useEffect } from 'react';
import { FolderGit2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function TeamDashboardPage() {
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/team/projects')
      .then(res => res.json())
      .then(data => setProjectsData(data))
      .finally(() => setIsLoading(false));
  }, []);

  const activeProjects = projectsData.filter(p => p.project.status !== 'completed');

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Team Dashboard</h2>
        <p className="text-muted-foreground mt-1">Overview of your assigned tasks and projects.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <FolderGit2 className="w-5 h-5 text-primary" />
            Active Assignments ({isLoading ? '...' : activeProjects.length})
          </h3>
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : activeProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">You have no active projects.</p>
            ) : (
              activeProjects.slice(0, 5).map((p) => (
                <div key={p.project.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{p.project.title}</p>
                    <p className="text-xs text-muted-foreground">{p.client?.companyName}</p>
                  </div>
                  <Link to={`/team/projects/${p.project.id}`} className="text-primary p-1 hover:bg-primary/10 rounded">
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))
            )}
          </div>
          {activeProjects.length > 5 && (
            <div className="mt-4 text-center">
              <Link to="/team/projects" className="text-sm text-primary hover:underline">View all active projects</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
