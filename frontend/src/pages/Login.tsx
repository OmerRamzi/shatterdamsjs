import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen bg-[#1c1c1e] flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-[1000px] h-[650px] bg-[#232326] rounded-[24px] shadow-2xl flex overflow-hidden border border-[#3a3a3d]/50">
        
        {/* Left Side - Image/Graphic */}
        <div className="hidden md:block relative w-1/2 h-full bg-black overflow-hidden">
          {/* We use the generated login-graphic.png */}
          <div 
            className="absolute inset-0 bg-[url('/brand/login-graphic.png')] bg-cover bg-center"
            style={{ opacity: 0.9 }}
          />
          {/* Subtle gradient overlay to ensure text is readable */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
          
          <div className="absolute top-8 left-8 flex items-center gap-2">
             {/* Using a text logo since it fits the dark sleek vibe, but could also be an img */}
             <span className="text-white font-bold text-xl tracking-wide">SHATTER</span>
          </div>

          <a href="#" className="absolute top-8 right-8 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white/90 text-xs font-medium transition-colors flex items-center gap-1.5 border border-white/10">
            Back to website <ArrowRight className="w-3 h-3" />
          </a>

          <div className="absolute bottom-12 left-0 right-0 px-10 text-center">
            <h2 className="text-white text-3xl font-semibold leading-tight tracking-tight shadow-sm">
              Secure Assets,<br/>Seamless Workflow
            </h2>
            <div className="flex items-center justify-center gap-2 mt-6">
              <div className="h-1 w-6 rounded-full bg-white" />
              <div className="h-1 w-2 rounded-full bg-white/30" />
              <div className="h-1 w-2 rounded-full bg-white/30" />
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative">
          <h1 className="text-white text-3xl font-semibold mb-2">Sign in to Shatter</h1>
          <p className="text-[#a1a1aa] text-sm mb-8">
            Access your digital asset management portal
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full bg-[#2c2c2f] border border-[#3a3a3d] rounded-lg px-4 py-3 text-white placeholder-[#71717a] text-sm focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
              />
            </div>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-[#2c2c2f] border border-[#3a3a3d] rounded-lg pl-4 pr-10 py-3 text-white placeholder-[#71717a] text-sm focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-[#71717a] hover:text-[#a1a1aa] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 pb-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#3a3a3d] bg-[#2c2c2f] checked:bg-yellow-500 checked:border-yellow-500 focus:ring-yellow-500/30 focus:ring-offset-0 transition-colors cursor-pointer appearance-none relative
                  before:content-['✓'] before:absolute before:text-black before:text-xs before:font-bold before:opacity-0 checked:before:opacity-100 before:top-[-1px] before:left-[2px]"
                />
                <span className="text-sm text-[#a1a1aa] group-hover:text-white transition-colors">Remember me</span>
              </label>

              <Link to="/forgot-password" className="text-sm text-yellow-500 hover:text-yellow-400 transition-colors font-medium">
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-500/10 rounded-lg border border-red-500/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-yellow-500 text-black font-semibold rounded-lg py-3 hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isPending ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-8 flex items-center gap-4 before:h-px before:flex-1 before:bg-[#3a3a3d] after:h-px after:flex-1 after:bg-[#3a3a3d]">
            <span className="text-xs text-[#71717a] font-medium uppercase tracking-wider">Or sign in with</span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <button className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#2c2c2f] border border-[#3a3a3d] hover:bg-[#323236] text-white text-sm font-medium transition-colors">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4" />
              Google
            </button>
            <button className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#2c2c2f] border border-[#3a3a3d] hover:bg-[#323236] text-white text-sm font-medium transition-colors">
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.19 2.31-.88 3.5-.88 1.63.02 2.92.65 3.73 1.83-3.12 1.83-2.6 5.86.37 7.07-.76 1.76-1.74 3.19-2.68 4.15zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Apple
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
