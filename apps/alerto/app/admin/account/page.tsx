"use client";

import * as React from "react";
import { useAdmin, supabase } from "@/components/admin/ctx";
import { ROLE_LABEL } from "@/lib/rbac";
import { Card, CardBody, Button, Input, Label, Spinner, Badge } from "@/components/ui";

export default function Account() {
  const { session, role } = useAdmin();
  const { authFetch } = useAdmin();

  // ── Display name ──
  const [fullName, setFullName] = React.useState("");
  const [loadingName, setLoadingName] = React.useState(true);
  const [savingName, setSavingName] = React.useState(false);
  const [nameMsg, setNameMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  // ── Password ──
  const [pw1, setPw1] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [savingPw, setSavingPw] = React.useState(false);
  const [pwMsg, setPwMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  React.useEffect(() => {
    if (!session) return;
    supabase()
      .from("alerto_admins")
      .select("full_name")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setFullName(data?.full_name ?? "");
        setLoadingName(false);
      });
  }, [session]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameMsg(null);
    const res = await authFetch("/api/account", {
      method: "PATCH",
      body: JSON.stringify({ full_name: fullName }),
    });
    setSavingName(false);
    setNameMsg(res.ok ? { ok: true, text: "Na-save ang pangalan." } : { ok: false, text: "Hindi na-save." });
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pw1.length < 8) return setPwMsg({ ok: false, text: "Kailangan hindi bababa sa 8 karakter ang password." });
    if (pw1 !== pw2) return setPwMsg({ ok: false, text: "Hindi magkatugma ang dalawang password." });
    setSavingPw(true);
    const { error } = await supabase().auth.updateUser({ password: pw1 });
    setSavingPw(false);
    if (error) return setPwMsg({ ok: false, text: error.message });
    setPw1("");
    setPw2("");
    setPwMsg({ ok: true, text: "Matagumpay na napalitan ang iyong password." });
  }

  return (
    <div className="mx-auto max-w-[620px] space-y-6">
      <div>
        <h1 className="font-serif text-[24px] font-bold tracking-[-0.01em] text-slate-900">Account</h1>
        <p className="mt-1 text-[14px] text-slate-500">Pamahalaan ang iyong profile at password.</p>
      </div>

      {/* Account info */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Label className="mb-1">Email</Label>
            <div className="font-mono text-[13px] text-slate-800">{session?.user.email}</div>
          </div>
          <div className="text-right">
            <Label className="mb-1">Role</Label>
            {role && (
              <Badge className="border-slate-200 bg-slate-50 text-slate-600">{ROLE_LABEL[role]}</Badge>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Display name */}
      <Card>
        <CardBody>
          <form onSubmit={saveName}>
            <Label htmlFor="name">Display Name</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                placeholder="Iyong pangalan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loadingName}
              />
              <Button type="submit" disabled={savingName || loadingName}>
                {savingName ? <Spinner className="h-4 w-4" /> : "I-save"}
              </Button>
            </div>
            {nameMsg && (
              <p className={"mt-2 text-[13px] " + (nameMsg.ok ? "text-emerald-600" : "text-brand-600")}>{nameMsg.text}</p>
            )}
            <p className="mt-2 text-[11.5px] text-slate-400">Ito ang ipinapakita sa dashboard at sa listahan ng team.</p>
          </form>
        </CardBody>
      </Card>

      {/* Password */}
      <Card>
        <CardBody>
          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <Label className="mb-3 text-slate-700">Palitan ang Password</Label>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="pw1">Bagong password</Label>
                  <Input id="pw1" type="password" autoComplete="new-password" placeholder="••••••••" value={pw1} onChange={(e) => setPw1(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="pw2">Ulitin ang bagong password</Label>
                  <Input id="pw2" type="password" autoComplete="new-password" placeholder="••••••••" value={pw2} onChange={(e) => setPw2(e.target.value)} />
                </div>
              </div>
            </div>
            {pwMsg && (
              <p className={"text-[13px] " + (pwMsg.ok ? "text-emerald-600" : "text-brand-600")}>{pwMsg.text}</p>
            )}
            <Button type="submit" disabled={savingPw}>
              {savingPw && <Spinner className="h-4 w-4" />}
              Palitan ang password
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
