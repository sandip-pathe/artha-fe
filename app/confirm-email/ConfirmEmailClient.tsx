"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2, MailCheck, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function ConfirmEmailClient() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);

  const resendConfirmation = async () => {
    if (!email || !supabase) {
      setError("Email missing hai. Register page se dobara try karo.");
      return;
    }

    setResending(true);
    setError("");
    setStatus("");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (resendError) {
        throw new Error(resendError.message);
      }
      setStatus("Confirmation email dobara bhej diya.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email resend failed.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white">
            <MailCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text">Confirm your email</h1>
            <p className="text-sm text-muted">Account activate karne ke liye inbox check karo.</p>
          </div>
        </div>

        <div className="space-y-3 text-sm leading-6 text-muted">
          <p>
            Humne confirmation link bheja hai
            {email ? <span className="font-semibold text-text"> {email}</span> : null}.
          </p>
          <p>Link click karte hi Artha onboarding screen par aa jayega.</p>
        </div>

        {status && (
          <div className="mt-4 rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-sm text-success">
            {status}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={resendConfirmation}
            disabled={resending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-[#b85b1a] disabled:opacity-60"
          >
            {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Resend confirmation
          </button>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold text-muted hover:text-text"
          >
            I confirmed, go to login
          </Link>
        </div>
      </section>
    </main>
  );
}

