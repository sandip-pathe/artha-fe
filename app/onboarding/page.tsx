"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Database, FileText, Loader2, Store } from "lucide-react";
import { AuthSession, getStoredAuthSession } from "@/lib/auth-session";

type OnboardingStatus = {
  has_context: boolean;
  memory_count: number;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredAuthSession();
    if (!stored) {
      router.replace("/login");
      return;
    }
    setSession(stored);

    const loadStatus = async () => {
      try {
        const res = await fetch("/api/onboarding/status", {
          headers: { Authorization: `Bearer ${stored.token}` },
        });
        if (res.ok) {
          setStatus((await res.json()) as OnboardingStatus);
        }
      } finally {
        setLoading(false);
      }
    };

    void loadStatus();
  }, [router]);

  if (!session || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-brand" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <section className="mx-auto max-w-4xl">
        <header className="mb-6">
          <p className="text-sm font-medium text-muted">Onboarding</p>
          <h1 className="mt-1 text-3xl font-semibold text-text">
            Set up {session.merchant.store_name}
          </h1>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <Store className="mb-4 h-5 w-5 text-brand" />
            <h2 className="text-lg font-semibold text-text">Merchant Profile</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Store</dt>
                <dd className="text-right font-medium text-text">{session.merchant.store_name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Phone</dt>
                <dd className="text-right font-medium text-text">{session.merchant.phone}</dd>
              </div>
              {session.merchant.location && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Location</dt>
                  <dd className="text-right font-medium text-text">{session.merchant.location}</dd>
                </div>
              )}
            </dl>
          </article>

          <article className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <Database className="mb-4 h-5 w-5 text-brand" />
            <h2 className="text-lg font-semibold text-text">Merchant Memory</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Add products, suppliers, credit rules, known customer behavior, and payment context.
            </p>
            <div className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted">
              {status?.has_context
                ? `${status.memory_count} memory notes available`
                : "No onboarding memory added yet"}
            </div>
          </article>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/onboarding/context"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-[#b85b1a]"
          >
            <FileText className="h-4 w-4" />
            Add shop context
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-muted hover:text-text"
          >
            Continue to Artha
          </Link>
        </div>
      </section>
    </main>
  );
}
