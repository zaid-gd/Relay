"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { emptyStateAssets } from "../brand-assets";
import { CutLabLockup } from "../cutlab-brand";

export default function ClientPortalLandingPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 text-foreground">
      <section className="w-full max-w-[680px] rounded-lg border border-border bg-card p-6 text-center text-card-foreground md:p-10">
        <div className="mb-6 flex justify-center">
          <CutLabLockup subtitle="Client Portal" />
        </div>
        <img
          src={emptyStateAssets.projects}
          alt=""
          aria-hidden="true"
          className="mx-auto mb-4 w-[210px] max-w-[70%]"
        />
        <h1 className="font-[family-name:var(--font-geist-sans)] text-[28px] font-bold md:text-4xl">
          A project link is required
        </h1>
        <p className="mx-auto mt-2 max-w-[500px] text-sm leading-relaxed text-muted-foreground">
          No account required. Open the unique portal link shared by your editor to track progress, review
          deliverables, and submit revision requests.
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
      </section>
    </main>
  );
}
