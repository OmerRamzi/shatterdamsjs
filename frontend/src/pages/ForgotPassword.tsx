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
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <img src="/brand/black.png" alt="Shatter DAMS" className="h-12 mx-auto mb-4 object-contain" />
            <h1 className="text-3xl font-bold tracking-tight text-primary">Forgot Password</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="email">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
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
                disabled={isPending}
                className="w-full bg-primary text-primary-foreground font-medium rounded-lg py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          ) : (
            <div className="space-y-5 text-center">
              <div className="p-4 bg-green-500/10 text-green-600 rounded-lg border border-green-500/20">
                {message || "If an account with that email exists, we sent a password reset link."}
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
