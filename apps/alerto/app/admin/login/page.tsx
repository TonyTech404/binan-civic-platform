"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAdmin, supabase } from "@/components/admin/ctx";
import { Seal } from "@/components/Seal";
import { Button, Input, Label, Spinner } from "@/components/ui";

export default function AdminLogin() {
  const router = useRouter();
  const { session, refresh } = useAdmin();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (session) router.replace("/admin");
  }, [session, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    await refresh();
    router.replace("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="fixed top-0 left-0 right-0 h-1 bg-brand-600" />
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-start gap-2 rounded-sm border-l-[3px] border-l-brand-600 bg-brand-50 px-3.5 py-2.5">
          <div>
            <div className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-brand-800">
              Restricted Access
            </div>
            <div className="text-[11px] leading-[1.5] text-brand-700">
              Authorized City Government of Biñan personnel only.
            </div>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-9 shadow-sm">
          <div className="mb-8 flex items-center gap-3">
            <Seal size={48} />
            <div>
              <div className="font-serif text-[16px] font-bold tracking-[-0.01em] text-slate-900">
                BANTAY BIÑAN
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-600">
                Alerto · Staff Portal
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email" type="email" autoComplete="email"
                placeholder="staff@binan.gov.ph"
                value={email} onChange={(e) => setEmail(e.target.value)} required
              />
            </div>
            <div>
              <Label htmlFor="pw">Password</Label>
              <Input
                id="pw" type="password" autoComplete="current-password"
                placeholder="••••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} required
              />
            </div>
            {error && <p className="text-[13px] text-brand-600">{error}</p>}
            <Button type="submit" size="lg" className="mt-3 w-full" disabled={loading}>
              {loading && <Spinner className="h-5 w-5" />}
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
