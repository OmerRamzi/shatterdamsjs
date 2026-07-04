import { useState, useEffect } from 'react';
import { 
  FolderGit2, 
  Building2, 
  CircleDollarSign,
  ArrowUpRight
} from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/activity?limit=5')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setActivities(data);
        } else {
          setActivities([]);
          console.error('Failed to load activities:', data);
        }
      })
      .catch(err => {
        console.error('Activity fetch error:', err);
        setActivities([]);
      })
      .finally(() => setIsLoading(false));
  }, []);
  
  const metrics = [
    { title: "Total Projects", value: "24", change: "+12%", icon: FolderGit2, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Active Projects", value: "12", change: "+2", icon: FolderGit2, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { title: "Total Clients", value: "48", change: "+4%", icon: Building2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Revenue (YTD)", value: "$124,500", change: "+18%", icon: CircleDollarSign, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">Welcome back. Here is your overview.</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${metric.bg} ${metric.color}`}>
                <metric.icon className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-emerald-500">
                {metric.change}
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
              <h3 className="text-2xl font-bold mt-1">{metric.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Pending File Approvals (Mock) */}
        <div className="col-span-4 bg-card border border-border rounded-xl shadow-sm">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-lg">Pending Approvals</h3>
            <Link to="/projects" className="text-sm text-primary hover:underline font-medium">View all</Link>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/30">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                      PDF
                    </div>
                    <div>
                      <p className="font-medium">Homepage_Mockup_v2.pdf</p>
                      <p className="text-xs text-muted-foreground">Uploaded by John Doe • Project: ACME Rebrand</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn-secondary text-xs px-3 py-1.5">Reject</button>
                    <button className="btn-primary text-xs px-3 py-1.5">Approve</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Global Activity Feed */}
        <div className="col-span-3 bg-card border border-border rounded-xl shadow-sm">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-lg">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading activity...</p>
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
              ) : (
                activities.map((activity, i) => (
                  <div key={activity.id} className="flex gap-4">
                    <div className="relative mt-1">
                      <div className="w-3 h-3 bg-primary rounded-full ring-4 ring-primary/20"></div>
                      {i !== activities.length - 1 && <div className="absolute top-4 left-1.5 w-px h-10 bg-border"></div>}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        <span className="font-semibold">{activity.user?.displayName || 'System'}</span>{" "}
                        <span className="text-muted-foreground font-normal">{activity.action}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
