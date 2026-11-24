import { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }

      setSuccess(true);
      setMessage(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#101216] p-4 font-sans">
      <div className="max-w-md w-full bg-[#16181D] border border-white/10 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-6">
            <img src="/brand/logo-yellow.png" alt="Shatter DAMS" className="h-8 mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-bold tracking-tight text-white font-heading">Reset password</h1>
            <p className="text-slate-400 mt-1.5 text-xs sm:text-sm">
              Enter your email address to receive password reset instructions.
            </p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="email">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 text-xs text-rose-300 bg-rose-500/10 rounded-lg border border-rose-500/20">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-lg py-2.5 text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Sending instructions..." : "Send reset link"}
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-emerald-500/10 text-emerald-400 text-xs sm:text-sm rounded-lg border border-emerald-500/20">
                {message || "If an account with that email exists, we sent a password reset link."}
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 inline-flex items-center gap-1.5 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
