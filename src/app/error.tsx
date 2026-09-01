"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { reportEssentialError } from "@/lib/telemetry";
import { RelayBrand } from "./relay-brand";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportEssentialError(error);
  }, [error]);
  return (
    <main
      id="main-content"
      className="grid min-h-dvh place-items-center bg-[var(--surface-canvas)] px-4 py-8 text-[var(--text-primary)]"
    >
      <Card
        className="w-full max-w-[560px] bg-[var(--surface-panel)] p-6 text-[var(--text-primary)] shadow-[var(--shadow-panel)] md:p-8"
        aria-labelledby="error-heading"
      >
        <div className="space-y-4">
          <RelayBrand compact />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--app-muted)]">
              Unexpected error
            </p>
            <h1
              id="error-heading"
              className="mt-2 font-[family-name:var(--font-geist-sans)] text-[30px] font-bold leading-tight"
            >
              Relay needs a refresh
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              The tracker hit an unexpected app error. Your saved projects stay
              in local browser storage.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={reset}
              className="min-h-11 bg-[var(--app-highlight)] text-white hover:bg-[var(--app-accent)]"
            >
              Try Again
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-11 border-[var(--app-border)] text-[var(--app-highlight)]"
            >
              <Link href="/">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
}
