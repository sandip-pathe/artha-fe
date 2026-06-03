"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { storeAuthSession, syncBackendSession } from "@/lib/auth-session";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const finishAuth = async () => {
      try {
        if (!supabase) {
          throw new Error("Supabase config missing hai.");
        }

        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw new Error(exchangeError.message);
          }
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw new Error(sessionError.message);
        }
        const token = data.session?.access_token;
        if (!token) {
          window.location.replace("/login?confirmed=1");
          return;
        }

        const session = await syncBackendSession(token);
        storeAuthSession(session);
        window.location.replace("/onboarding");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Email confirmation failed.");
      }
    };

    void finishAuth();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-5 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold text-text">Finishing sign in</h1>
        <p className="mt-2 text-sm text-muted">Email confirm ho gaya. Artha workspace bana raha hoon.</p>
        {!error && <Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin text-brand" />}
        {error && (
          <div className="mt-5 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}
      </section>
    </main>
  );
}

