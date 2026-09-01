"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RelayBrand } from "./relay-brand";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="grid min-h-dvh place-items-center bg-[var(--surface-canvas)] px-4 py-8 text-[var(--text-primary)]"
    >
      <Card
        className="w-full max-w-[560px] bg-[var(--surface-panel)] p-6 text-[var(--text-primary)] shadow-[var(--shadow-panel)] md:p-8"
        aria-labelledby="not-found-heading"
      >
        <div className="space-y-4">
          <RelayBrand compact />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--app-muted)]">
              Relay
            </p>
            <h1
              id="not-found-heading"
              className="mt-2 font-[family-name:var(--font-geist-sans)] text-[30px] font-bold leading-tight"
            >
              Page not found
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              This Relay route does not exist. Return to the dashboard to keep
              tracking work.
            </p>
          </div>
          <Button
            asChild
            className="min-h-11 w-fit bg-[var(--app-highlight)] text-white hover:bg-[var(--app-accent)]"
          >
            <Link href="/">Back to Dashboard</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
