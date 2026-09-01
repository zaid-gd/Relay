"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ClientPortalLandingPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 text-foreground">
      <Card className="w-full max-w-lg p-6 text-center md:p-10">
        <div className="mb-6 flex justify-center">
          <a
            href="/"
            aria-label="Relay home"
            className="inline-flex items-center gap-2 text-foreground no-underline"
          >
            <span className="grid size-8 place-items-center rounded-[6px] bg-foreground text-sm font-bold text-background">
              R
            </span>
            <span className="text-lg font-bold tracking-tight">Relay</span>
          </a>
        </div>
        <h1 className="font-[family-name:var(--font-geist-sans)] text-[28px] font-bold md:text-4xl">
          A project link is required
        </h1>
        <p className="mx-auto mt-2 max-w-[500px] text-sm leading-relaxed text-muted-foreground">
          No account required. Open the unique portal link shared by your editor
          to track progress, review deliverables, and submit revision requests.
        </p>
        <Button
          asChild
          variant="outline"
          className="mt-6 border-[var(--app-border)] text-[var(--app-highlight)]"
        >
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            Back to Relay
          </Link>
        </Button>
      </Card>
    </main>
  );
}
