"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { getStoredAuthSession, storeAuthSession, syncBackendSession } from "@/lib/auth-session";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getStoredAuthSession()) {
      window.location.replace("/");
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      if (!supabase) {
        throw new Error("Supabase config missing hai.");
      }
      if (!storeName.trim()) {
        throw new Error("Store name zaroori hai.");
      }
      if (!phone.trim()) {
        throw new Error("Phone number zaroori hai.");
      }
      const normalizedEmail = email.trim().toLowerCase();

      const { data, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            store_name: storeName.trim(),
            owner_name: ownerName.trim(),
            location: location.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (authError) {
        throw new Error(authError.message || "Signup failed.");
      }

      if (!data.session?.access_token) {
        router.replace(`/confirm-email?email=${encodeURIComponent(normalizedEmail)}`);
        return;
      }

      const session = await syncBackendSession(data.session.access_token);
      storeAuthSession(session);
      window.location.assign("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed. Dobara try karo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <section className="mx-auto w-full max-w-2xl rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text">Create Merchant Account</h1>
            <p className="text-sm text-muted">Basic identity for your Artha workspace</p>
          </div>
        </div>

        <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
          <input
            value={storeName}
            onChange={(event) => setStoreName(event.target.value)}
            placeholder="Store name"
            className="rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-brand sm:col-span-2"
            disabled={loading}
          />
          <input
            value={ownerName}
            onChange={(event) => setOwnerName(event.target.value)}
            placeholder="Owner name"
            className="rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-brand"
            disabled={loading}
          />
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Location"
            className="rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-brand"
            disabled={loading}
          />
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Phone number"
            inputMode="tel"
            className="rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-brand"
            disabled={loading}
          />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            className="rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-brand"
            disabled={loading}
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            className="rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-brand sm:col-span-2"
            disabled={loading}
          />

          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger sm:col-span-2">
              {error}
            </div>
          )}
          {notice && (
            <div className="rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-sm text-success sm:col-span-2">
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#b85b1a] disabled:opacity-60 sm:col-span-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
          </button>
        </form>

        <Link href="/login" className="mt-4 block text-center text-sm font-medium text-muted hover:text-text">
          Already have an account? Login
        </Link>
      </section>
    </main>
  );
}
