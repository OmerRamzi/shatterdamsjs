
import { BarChart } from 'lucide-react';

export default function Reports() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Reports</h1>
          <p className="text-slate-400 mt-1">View organization analytics and reports</p>
        </div>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center">
        <BarChart className="w-12 h-12 text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-200">Reports coming soon</h3>
        <p className="text-slate-400 mt-2 max-w-sm">We are working on bringing detailed analytics and reporting to your dashboard.</p>
      </div>
    </div>
  );
}
