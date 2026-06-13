import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2, Lock, Mail, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const { user, login, demoCreds } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(demoCreds.email);
  const [password, setPassword] = useState(demoCreds.password);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      toast.success('Welcome back', { description: 'Signing you in to Rozes.' });
      navigate('/');
    } else {
      toast.error('Sign-in failed', { description: res.error });
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-accent via-background to-accent p-12 lg:flex">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />

        <Brand />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
            <Sparkles className="h-3 w-3" /> Premium beauty operations
          </div>
          <h1 className="mt-5 font-heading text-5xl font-semibold leading-[1.05] text-balance">
            Track every petal of your business.
          </h1>
          <p className="mt-5 max-w-md text-muted-foreground text-balance">
            Real-time stock, daily sales, AI-assisted entry, and elegant reports — built for modern skincare brands.
          </p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
            {[
              { k: 'Products', v: '8+' },
              { k: 'Live alerts', v: '24/7' },
              { k: 'Reports', v: 'PDF · XLS' }
            ].map(s => (
              <div key={s.k} className="rounded-xl border bg-background/60 p-3 text-center backdrop-blur">
                <div className="font-heading text-xl font-semibold text-primary">{s.v}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{s.k}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">© Rozes Skincare · Curated with care</div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8 lg:hidden"><Brand /></div>
          <h2 className="font-heading text-3xl font-semibold">Welcome back</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your Rozes dashboard.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" autoFocus required className="pl-9"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" required className="pl-9"
                  value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </Button>

            <div className="rounded-md border bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">Demo:</span>{' '}
              {demoCreds.email} · {demoCreds.password}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/80 to-primary text-primary-foreground shadow-sm">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
          <path d="M12 4c-2.8 0-5 2-5 4.6 0 1.6.9 2.9 2.2 3.7C8.1 13 7 14.5 7 16c0 2.2 2.2 4 5 4s5-1.8 5-4c0-1.5-1.1-3-2.2-3.7C16.1 11.5 17 10.2 17 8.6 17 6 14.8 4 12 4zm0 3a2 2 0 110 4 2 2 0 010-4z" />
        </svg>
      </div>
      <div className="leading-none">
        <div className="font-heading text-lg font-semibold">Rozes</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-primary">Skincare</div>
      </div>
    </div>
  );
}
