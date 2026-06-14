import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Input, Label, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";

export function AdminLogin() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authLoading && session) {
    navigate("/admin", { replace: true });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate("/admin", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F4F1] px-4">
      {/* Red accent bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-brand-600" />

      <div className="w-full max-w-[400px]">
        {/* Restricted notice */}
        <div className="mb-6 flex items-start gap-2 rounded-sm border-l-[3px] border-l-brand-600 bg-brand-50 px-3.5 py-2.5">
          <Lock className="mt-[1px] h-3.5 w-3.5 flex-shrink-0 text-brand-600" />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-800 mb-0.5">
              Restricted Access
            </div>
            <div className="text-[11px] leading-[1.5] text-brand-700">
              Authorized City Government of Biñan personnel only.
            </div>
          </div>
        </div>

        {/* Login card */}
        <div className="rounded-md border border-slate-200 bg-white p-9 shadow-sm">
          {/* Brand */}
          <div className="mb-8 flex items-center gap-3">
            <img
              src="/binan-seal.png"
              alt="Biñan City Seal"
              width={52}
              height={52}
              className="flex-shrink-0 rounded-full object-cover"
              style={{ boxShadow: "0 0 0 2px #D4A800" }}
            />
            <div>
              <div className="font-serif text-[16px] font-bold tracking-[-0.01em] text-slate-900">
                BANTAY BIÑAN
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-600">
                Admin Portal
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="staff@binan.gov.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="pw">Password</Label>
              <Input
                id="pw"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-[13px] text-brand-600">{error}</p>}
            <Button type="submit" size="lg" className="mt-3 w-full" disabled={loading}>
              {loading && <Spinner className="h-5 w-5" />}
              Sign in to Admin Portal
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
