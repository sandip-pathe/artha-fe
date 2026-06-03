"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { getStoredAuthSession, storeAuthSession, syncBackendSession } from "@/lib/auth-session";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existing = getStoredAuthSession();
    if (existing) {
      router.replace("/");
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!supabase) {
        throw new Error("Supabase config missing hai.");
      }
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (authError || !data.session?.access_token) {
        throw new Error(authError?.message || "Email ya password galat hai.");
      }

      const session = await syncBackendSession(data.session.access_token);
      storeAuthSession(session);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Dobara try karo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text">Artha</h1>
            <p className="text-sm text-muted">Merchant login</p>
          </div>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-brand"
            disabled={loading}
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            className="w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-brand"
            disabled={loading}
          />

          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#b85b1a] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Login"}
          </button>
        </form>

        <Link
          href="/register"
          className="mt-4 block w-full text-center text-sm font-medium text-muted hover:text-text"
        >
          New merchant? Create account
        </Link>
      </section>
    </main>
  );
}
