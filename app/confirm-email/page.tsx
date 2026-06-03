import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ConfirmEmailClient } from "./ConfirmEmailClient";

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-brand" />
        </main>
      }
    >
      <ConfirmEmailClient />
    </Suspense>
  );
}

