import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }

      login(data.user);

      const from = location.state?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        const hostname = window.location.hostname;
        
        let correctSubdomain = 'team';
        if (data.user.role === 'administrator') correctSubdomain = 'admin';
        else if (data.user.role === 'client') correctSubdomain = 'client';
        
        const currentSubdomain = hostname.split('.')[0];
        
        if (currentSubdomain !== correctSubdomain && hostname.includes('.')) {
          const parts = hostname.split('.');
          parts[0] = correctSubdomain;
          window.location.href = window.location.protocol + '//' + parts.join('.') + '/';
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101216] flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-[960px] min-h-[580px] bg-[#16181D] rounded-2xl shadow-2xl flex overflow-hidden border border-white/10">
        
        {/* Left Side - Studio Graphic & Brand */}
        <div className="hidden md:block relative w-1/2 min-h-full bg-black overflow-hidden">
          <div 
            className="absolute inset-0 bg-[url('/brand/login-graphic.png')] bg-cover bg-center"
            style={{ opacity: 0.85 }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/85" />
          
          <div className="absolute top-8 left-8 flex items-center gap-2">
            <img src="/brand/logo-yellow.png" alt="Shatter" className="h-7 w-auto object-contain" />
          </div>

          <div className="absolute bottom-10 left-0 right-0 px-8 text-left">
            <div className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-2 font-heading">
              Digital Asset Management
            </div>
            <h2 className="text-white text-2xl font-bold leading-snug tracking-tight font-heading">
              Secure creative assets & studio operations in one workspace
            </h2>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center relative">
          <div className="mb-6">
            <h1 className="text-white text-2xl font-bold font-heading mb-1.5">Sign in</h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Enter your credentials to access your portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
              />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300" htmlFor="password">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-3.5 pr-10 py-2.5 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-yellow-400 focus:ring-yellow-400/30"
                />
                <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">Remember this device</span>
              </label>
            </div>

            {error && (
              <div className="p-3 text-xs text-rose-300 bg-rose-500/10 rounded-lg border border-rose-500/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-lg py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 text-xs sm:text-sm shadow-xs"
            >
              {isPending ? "Signing in..." : "Sign in to portal"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
