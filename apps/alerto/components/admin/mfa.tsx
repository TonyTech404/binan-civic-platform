"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase, useAdmin } from "@/components/admin/ctx";
import { Seal } from "@/components/Seal";
import { Button, Input, Spinner } from "@/components/ui";

// Shared frame + sign-out affordance so a user is never trapped on the MFA gate.

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="fixed top-0 left-0 right-0 h-1 bg-brand-600" />
      <div className="w-full max-w-[420px]">
        <div className="rounded-md border border-slate-200 bg-white p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

function SignOutLink() {
  const { signOut } = useAdmin();
  const router = useRouter();
  return (
    <div className="text-center">
      <button
        onClick={async () => {
          await signOut();
          router.replace("/admin/login");
        }}
        className="mt-5 text-[12px] font-semibold text-slate-400 hover:text-slate-700"
      >
        Sign out
      </button>
    </div>
  );
}

function CodeInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <Input
      autoFocus
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="123456"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      className="text-center text-lg tracking-[0.35em]"
    />
  );
}

/**
 * First-run MFA setup: shown when an authenticated user has no verified factor.
 * Enrolls a TOTP factor, renders the QR to scan, then confirms one code — which
 * also steps the session up to aal2.
 */
export function MfaEnroll() {
  const { refreshMfa } = useAdmin();
  const started = React.useRef(false);
  const [qr, setQr] = React.useState<string | null>(null);
  const [secret, setSecret] = React.useState("");
  const [factorId, setFactorId] = React.useState("");
  const [code, setCode] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [setupError, setSetupError] = React.useState<string | null>(null);
  const [verifying, setVerifying] = React.useState(false);

  React.useEffect(() => {
    if (started.current) return; // guard React strict-mode double invoke
    started.current = true;
    (async () => {
      const sb = supabase();
      // Clear any half-finished factor from a previous, abandoned attempt.
      const { data: list } = await sb.auth.mfa.listFactors();
      for (const f of list?.all ?? []) {
        if (f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
      }
      // Explicit issuer → clean "Bantay Alerto: <email>" label in the authenticator
      // app. Without it the issuer defaults to the request origin (e.g.
      // "localhost:3000"), whose colon collides with otpauth's issuer:account
      // separator and renders as a garbled, doubled label. ASCII only (no "ñ").
      const { data, error } = await sb.auth.mfa.enroll({
        factorType: "totp",
        issuer: "Bantay Alerto",
      });
      if (error) {
        setSetupError(error.message);
        return;
      }
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    })();
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setVerifying(true);
    const { error } = await supabase().auth.mfa.challengeAndVerify({ factorId, code });
    if (error) {
      setVerifying(false);
      setErr("Mali ang code. Subukan muli.");
      setCode("");
      return;
    }
    await refreshMfa(); // session is now aal2 → the layout gate lets them through
  }

  return (
    <Frame>
      <div className="mb-6 flex items-center gap-3">
        <Seal size={40} />
        <div>
          <div className="font-serif text-[16px] font-bold tracking-[-0.01em] text-slate-900">
            Set up 2-step verification
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-600">
            Kailangan · Isang beses lang
          </div>
        </div>
      </div>

      {setupError ? (
        <p className="text-[13px] leading-[1.55] text-brand-600">{setupError}</p>
      ) : !qr ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-6 w-6 text-slate-300" />
        </div>
      ) : (
        <>
          <ol className="mb-4 space-y-1 text-[13px] leading-[1.6] text-slate-600">
            <li>1. Mag-install ng authenticator app (Google Authenticator, Authy, atbp.).</li>
            <li>2. I-scan ang QR code sa ibaba.</li>
            <li>3. Ilagay ang 6-digit code para kumpirmahin.</li>
          </ol>
          <div className="flex justify-center rounded-md border border-slate-200 bg-slate-50 p-3">
            {/* Supabase returns the QR as an SVG data URI. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="MFA QR code" className="h-44 w-44" />
          </div>
          <div className="mt-3 text-center text-[11px] leading-[1.5] text-slate-400">
            Hindi ma-scan? Ilagay ito nang manu-mano:
            <div className="mt-1 break-all font-mono text-[12px] text-slate-600">{secret}</div>
          </div>

          <form onSubmit={verify} className="mt-5 space-y-3">
            <CodeInput value={code} onChange={setCode} />
            {err && <p className="text-[13px] text-brand-600">{err}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={verifying || code.length !== 6}>
              {verifying && <Spinner className="h-5 w-5" />}
              Kumpirmahin
            </Button>
          </form>
        </>
      )}
      <SignOutLink />
    </Frame>
  );
}

/**
 * Login step-up: shown when the user has a verified factor but this session is
 * still aal1. Verifying a code upgrades the session to aal2.
 */
export function MfaChallenge() {
  const { refreshMfa, session } = useAdmin();
  const [factorId, setFactorId] = React.useState("");
  const [ready, setReady] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [verifying, setVerifying] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase().auth.mfa.listFactors();
      const totp = data?.totp?.[0];
      if (totp) setFactorId(totp.id);
      setReady(true);
    })();
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setVerifying(true);
    const { error } = await supabase().auth.mfa.challengeAndVerify({ factorId, code });
    if (error) {
      setVerifying(false);
      setErr("Mali ang code. Subukan muli.");
      setCode("");
      return;
    }
    await refreshMfa();
  }

  return (
    <Frame>
      <div className="mb-6 flex items-center gap-3">
        <Seal size={40} />
        <div>
          <div className="font-serif text-[16px] font-bold tracking-[-0.01em] text-slate-900">
            2-step verification
          </div>
          <div className="font-mono text-[11px] text-slate-400">{session?.user.email}</div>
        </div>
      </div>
      <p className="text-[13px] leading-[1.55] text-slate-600">
        Ilagay ang 6-digit code mula sa iyong authenticator app.
      </p>
      <form onSubmit={verify} className="mt-4 space-y-3">
        <CodeInput value={code} onChange={setCode} disabled={!ready} />
        {err && <p className="text-[13px] text-brand-600">{err}</p>}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={verifying || code.length !== 6 || !factorId}
        >
          {verifying && <Spinner className="h-5 w-5" />}
          I-verify
        </Button>
      </form>
      <SignOutLink />
    </Frame>
  );
}
