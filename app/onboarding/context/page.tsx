"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, FileText, Loader2 } from "lucide-react";
import { AuthSession, getStoredAuthSession } from "@/lib/auth-session";

type SeedPayload = {
  shop_profile: string;
  inventory: string;
  customers: string;
  suppliers: string;
  credit_rules: string;
  payment_notes: string;
  document_text: string;
};

const emptyPayload: SeedPayload = {
  shop_profile: "",
  inventory: "",
  customers: "",
  suppliers: "",
  credit_rules: "",
  payment_notes: "",
  document_text: "",
};

export default function ContextSeedPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [payload, setPayload] = useState<SeedPayload>(emptyPayload);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = getStoredAuthSession();
    if (!stored) {
      router.replace("/login");
      return;
    }
    setSession(stored);
  }, [router]);

  const updateField = (field: keyof SeedPayload, value: string) => {
    setPayload((current) => ({ ...current, [field]: value }));
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    updateField("document_text", text.slice(0, 12000));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) {
      return;
    }

    setLoading(true);
    setError("");
    setSaved(null);

    try {
      const res = await fetch("/api/onboarding/context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { saved?: number; detail?: string };
      if (!res.ok) {
        throw new Error(data.detail || "Context save failed.");
      }
      setSaved(data.saved || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Context save failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-brand" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <section className="mx-auto max-w-5xl">
        <Link href="/onboarding" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-text">
          <ArrowLeft className="h-4 w-4" />
          Onboarding
        </Link>

        <header className="mb-5">
          <p className="text-sm font-medium text-muted">{session.merchant.store_name}</p>
          <h1 className="mt-1 text-3xl font-semibold text-text">Context Seeding</h1>
        </header>

        <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
          <Textarea
            label="Shop profile"
            value={payload.shop_profile}
            placeholder="Shop type, area, peak hours, what Artha should know..."
            onChange={(value) => updateField("shop_profile", value)}
          />
          <Textarea
            label="Inventory and products"
            value={payload.inventory}
            placeholder="Important products, categories, stock patterns, high margin items..."
            onChange={(value) => updateField("inventory", value)}
          />
          <Textarea
            label="Customers"
            value={payload.customers}
            placeholder="Regular customers, risky customers, VIPs, buying behavior..."
            onChange={(value) => updateField("customers", value)}
          />
          <Textarea
            label="Suppliers"
            value={payload.suppliers}
            placeholder="Supplier names, payment cycles, delivery days, dependencies..."
            onChange={(value) => updateField("suppliers", value)}
          />
          <Textarea
            label="Credit and udhaar rules"
            value={payload.credit_rules}
            placeholder="Who gets credit, limits, collection style, special cases..."
            onChange={(value) => updateField("credit_rules", value)}
          />
          <Textarea
            label="Payment and fraud notes"
            value={payload.payment_notes}
            placeholder="UPI habits, common fake screenshot patterns, payment rules..."
            onChange={(value) => updateField("payment_notes", value)}
          />

          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-semibold text-text">Document context</h2>
            </div>
            <input
              type="file"
              accept=".txt,.md,.csv"
              onChange={handleFile}
              className="mb-3 block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            <textarea
              value={payload.document_text}
              onChange={(event) => updateField("document_text", event.target.value)}
              placeholder="Paste policy docs, stock notes, customer lists, supplier terms, or any context Artha should remember."
              className="min-h-[180px] w-full resize-y rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none focus:border-brand"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger lg:col-span-2">
              {error}
            </div>
          )}
          {saved !== null && (
            <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-sm text-success lg:col-span-2">
              <CheckCircle className="h-4 w-4" />
              Saved {saved} memory note{saved === 1 ? "" : "s"}.
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-[#b85b1a] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save context"}
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-muted hover:text-text"
            >
              Continue to Artha
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

function Textarea({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-lg border border-border bg-surface p-4 shadow-sm">
      <span className="mb-2 block text-sm font-semibold text-text">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-[150px] w-full resize-y rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none focus:border-brand"
      />
    </label>
  );
}
