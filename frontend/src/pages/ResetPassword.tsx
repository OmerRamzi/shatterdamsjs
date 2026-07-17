import { useState, useEffect } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing password reset token.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsPending(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <img src="/brand/black.png" alt="Shatter DAMS" className="h-12 mx-auto mb-4 object-contain" />
            <h1 className="text-3xl font-bold tracking-tight text-primary">Reset Password</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Enter your new password below.
            </p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="password">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={!token}
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="confirmPassword">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={!token}
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending || !token}
                className="w-full bg-primary text-primary-foreground font-medium rounded-lg py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          ) : (
            <div className="space-y-5 text-center">
              <div className="p-4 bg-green-500/10 text-green-600 rounded-lg border border-green-500/20">
                Password has been successfully reset. Redirecting to login...
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm font-medium text-primary hover:underline inline-flex items-center">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </Link>
          </div>
        </div>
        <div className="bg-secondary/50 p-4 text-center border-t border-border">
          <p className="text-xs text-muted-foreground">
            Protected by Shatter Security System
          </p>
        </div>
      </div>
    </div>
  );
}
