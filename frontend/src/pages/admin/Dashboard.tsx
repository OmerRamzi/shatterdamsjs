import { useState, useEffect } from 'react';
import { 
  Folder, 
  Users,
  Briefcase,
  Banknote,
  Plus,
  Receipt,
  UserPlus,
  BarChart,
  Target,
  Inbox
} from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeProjects: 0,
    allProjects: 0,
    revenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard data
    Promise.all([
      fetch('/api/activity?limit=5').then(res => res.json()),
      fetch('/api/portal/stats').then(res => res.json())
    ])
    .then(([activityData, statsData]) => {
      if (Array.isArray(activityData)) {
        setActivities(activityData);
      }
      if (statsData && !statsData.error) {
        setStats(statsData);
      }
    })
    .catch(err => {
      console.error('Dashboard fetch error:', err);
    })
    .finally(() => setIsLoading(false));
  }, []);
  
  const metrics = [
    { title: "TOTAL CLIENTS", value: stats.totalClients.toString(), icon: Users, color: "text-slate-400" },
    { title: "ACTIVE PROJECTS", value: stats.activeProjects.toString(), icon: Briefcase, color: "text-slate-400" },
    { title: "ALL PROJECTS", value: stats.allProjects.toString(), icon: Folder, color: "text-slate-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Overview</h2>
        </div>
        <Link to="/projects" className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold px-4 py-2 rounded-full flex items-center gap-2 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-4">
        {metrics.map((metric, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 mb-1">{metric.title}</p>
              <h3 className="text-3xl font-black text-slate-900">{metric.value}</h3>
            </div>
            <div className={`w-12 h-12 flex items-center justify-center ${metric.color}`}>
              <metric.icon className="w-8 h-8 opacity-50" />
            </div>
          </div>
        ))}
        
        {/* Revenue Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">REVENUE COLLECTED</p>
            <h3 className="text-3xl font-black text-yellow-500">Rs. {stats.revenue.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 flex items-center justify-center text-slate-400">
            <Banknote className="w-8 h-8 opacity-50" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Quick Actions */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-red-500" />
              <h3 className="font-bold text-slate-900">Quick Actions</h3>
            </div>
            <div className="space-y-3">
              <Link to="/invoices/new" className="flex items-center gap-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition-colors">
                <div className="bg-white border border-slate-200 p-2 rounded-lg text-slate-600 shadow-sm">
                  <Receipt className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm text-slate-700">Create New Invoice</span>
              </Link>
              
              <Link to="/team" className="flex items-center gap-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition-colors">
                <div className="bg-white border border-slate-200 p-2 rounded-lg text-slate-600 shadow-sm">
                  <UserPlus className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm text-slate-700">Add Team Member</span>
              </Link>
              
              <Link to="/reports" className="flex items-center gap-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition-colors">
                <div className="bg-white border border-slate-200 p-2 rounded-lg text-slate-600 shadow-sm">
                  <BarChart className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm text-slate-700">View Financial Reports</span>
              </Link>
            </div>
          </div>
          
          {/* Upcoming Deadlines */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-500 rounded-md"></div>
                <h3 className="font-bold text-slate-900">Upcoming Deadlines</h3>
              </div>
              <Link to="/projects" className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">View All</Link>
            </div>
            <div className="text-center py-6 text-slate-500 text-sm font-medium">
              No upcoming deadlines
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="col-span-12 lg:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-slate-900">Recent Activity</h3>
            </div>
            <button className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">Live Updates</button>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            {isLoading ? (
              <p className="text-sm text-slate-500 text-center py-4 font-medium">Loading activity...</p>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10">
                <Inbox className="w-12 h-12 text-slate-300 mb-4" />
                <h4 className="text-slate-700 font-bold mb-1">No recent activity</h4>
                <p className="text-slate-500 text-sm">When files are uploaded or reviewed, updates will appear here.</p>
              </div>
            ) : (
              <div className="space-y-6 mt-4 justify-start">
                {activities.map((activity, i) => (
                  <div key={activity.id} className="flex gap-4">
                    <div className="relative mt-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full ring-4 ring-blue-50"></div>
                      {i !== activities.length - 1 && <div className="absolute top-4 left-1.5 w-px h-10 bg-slate-200"></div>}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">
                        <span className="font-bold text-slate-900">{activity.user?.name || 'System'}</span>{" "}
                        {activity.action}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">
                        {activity.createdAt ? new Date(activity.createdAt.replace(' ', 'T') + (activity.createdAt.endsWith('Z') ? '' : 'Z')).toLocaleString() : 'Just now'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
