import { User, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export function AdminTopbar() {
  const { user } = useAuth();
  
  return (
    <header className="h-16 bg-[#18181b] flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-black tracking-tighter text-yellow-400 uppercase italic">
          SHATTER
        </h1>
        <span className="text-sm font-medium text-slate-200 mt-1">
          Administrator Dashboard
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 transition-colors text-slate-900 px-4 py-2 rounded-full font-bold text-sm">
          <div className="w-5 h-5 rounded-full border border-slate-900 flex items-center justify-center">
            <User className="w-3 h-3" />
          </div>
          {user?.displayName || 'Omer Ramzi'}
          <ChevronDown className="w-4 h-4 opacity-70" />
        </button>
      </div>
    </header>
  );
}
