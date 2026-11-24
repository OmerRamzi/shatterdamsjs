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
    <header className="h-14 bg-[#101216] border-b border-white/10 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            type="button"
            className="p-1.5 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors lg:hidden focus:outline-none focus:ring-2 focus:ring-yellow-400"
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? <X className="w-5 h-5 text-yellow-400" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex items-center">
            <img src="/brand/logo-yellow.png" alt="Shatter" className="h-6 sm:h-7 w-auto object-contain transition-opacity group-hover:opacity-90" />
          </div>

          <div className="hidden sm:flex flex-col border-l border-white/10 pl-3">
            <span className="text-xs font-semibold text-slate-100 tracking-tight font-heading">
              Shatter DAMS
            </span>
            <span className="text-[11px] text-slate-400">
              Operations & Digital Assets
            </span>
          </div>
        </Link>
      </div>

      {/* Right: Status indicator & User profile */}
      <div className="flex items-center gap-3">
        {/* System status */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Connected</span>
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            type="button"
            className="flex items-center gap-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 transition-colors text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
          >
            <div className="w-6 h-6 rounded-md bg-yellow-400 text-slate-950 flex items-center justify-center font-bold text-xs">
              {userInitials || <User className="w-3.5 h-3.5" />}
            </div>
            <span className="max-w-[120px] truncate">{displayName}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-[#16181D] text-slate-200 rounded-xl shadow-xl border border-white/10 py-1.5 z-50 animate-in fade-in duration-150">
              <div className="px-3.5 py-2.5 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">
                    Admin
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{user?.email || "admin@shatter.local"}</p>
              </div>

              <div className="py-1">
                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  System settings
                </Link>
                <Link
                  to="/users"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  Users & permissions
                </Link>
              </div>

              <div className="border-t border-white/10 pt-1 mt-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 w-full transition-colors text-left font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
