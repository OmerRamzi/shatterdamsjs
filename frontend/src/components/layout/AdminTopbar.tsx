import { useState, useRef, useEffect } from "react";
import { User, ChevronDown, Menu, X, LogOut, Settings, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface AdminTopbarProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

export function AdminTopbar({ onMenuToggle, isMenuOpen }: AdminTopbarProps) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.name || "Omer Ramzi";
  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-md">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            type="button"
            className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors lg:hidden focus:outline-none focus:ring-2 focus:ring-amber-400"
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <span className="text-2xl sm:text-3xl font-black tracking-tighter text-amber-400 uppercase italic transition-transform group-hover:scale-105 inline-block">
              SHATTER
            </span>
            <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full opacity-80" />
          </div>

          <div className="hidden sm:flex flex-col border-l border-slate-700/80 pl-2.5">
            <span className="text-xs font-semibold text-slate-200 tracking-wide">
              Administrator Dashboard
            </span>
            <span className="text-[10px] text-amber-400/90 font-medium tracking-wider uppercase">
              Operations & Digital Assets
            </span>
          </div>
        </Link>
      </div>

      {/* Right: Quick actions & User profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Live system pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>System Online</span>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            type="button"
            className="flex items-center gap-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all text-slate-950 pl-1.5 pr-3 py-1.5 rounded-full font-bold text-xs sm:text-sm shadow-sm hover:shadow active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            <div className="w-7 h-7 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center font-black text-xs shadow-inner">
              {userInitials || <User className="w-3.5 h-3.5" />}
            </div>
            <span className="max-w-[110px] sm:max-w-[150px] truncate">{displayName}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-900 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Admin
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email || "admin@shatter.local"}</p>
              </div>

              <div className="py-1">
                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  System Settings
                </Link>
                <Link
                  to="/users"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition-colors"
                >
                  <Shield className="w-4 h-4 text-slate-400" />
                  Manage Users & Roles
                </Link>
              </div>

              <div className="border-t border-slate-100 pt-1 mt-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 w-full transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
