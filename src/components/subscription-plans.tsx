"use client";

import { PricingTable, useUser } from "@clerk/nextjs";
import { Check } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { shouldShowSubscriptionWelcome } from "@/lib/subscription-onboarding";
import { cn } from "@/lib/utils";

const welcomePlans = [
  {
    name: "Free",
    price: "$0",
    description: "Core Relay tools for solo editing work.",
    features: ["Projects and Clients", "Reviews and delivery", "Cloud workspace"],
    available: true,
  },
  {
    name: "Creator",
    price: "$6.99 / month",
    description: "More storage, Team Members, and priority support.",
    features: ["More Team Members", "More storage", "Priority support"],
    available: false,
  },
  {
    name: "Studio",
    price: "$11.99 / month",
    description: "Higher limits and early access for growing studios.",
    features: ["Largest storage limit", "More Team access", "Early feature access"],
    available: false,
  },
] as const;

const pricingAppearance = {
  variables: {
    borderRadius: "6px",
    colorPrimary: "var(--app-accent)",
    colorBackground: "var(--app-panel)",
    colorForeground: "var(--app-ink)",
    colorMutedForeground: "var(--app-muted)",
    spacing: "1.125rem",
  },
  elements: {
    pricingTable: "items-stretch",
    pricingTableCard: "min-h-[32rem] h-full",
    pricingTableCardHeader: "min-h-40",
    pricingTableCardBody: "flex-1",
    pricingTableCardFeatures: "mt-5 border-t border-[var(--app-border)] pt-5",
    pricingTableCardFeaturesList: "gap-0",
    pricingTableCardFeaturesListItem: "min-h-11 border-b border-[var(--app-border)] py-3 last:border-b-0",
    pricingTableCardFooter: "mt-auto",
  },
};

export function ClerkPricingPlans() {
  return (
    <div className="w-full">
      <PricingTable
        for="user"
        collapseFeatures={false}
        ctaPosition="bottom"
        newSubscriptionRedirectUrl="/subscription"
        appearance={pricingAppearance}
      />
    </div>
  );
}

export function FirstLoginPlanDialog() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const open = Boolean(
    !completed &&
    isLoaded &&
      isSignedIn &&
      user &&
      shouldShowSubscriptionWelcome({
        completed: user.unsafeMetadata.relayPlanWelcomeComplete,
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
      }),
  );

  async function continueWithFree() {
    if (!user || saving) return;
    setSaving(true);
    setError("");
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          relayPlanWelcomeComplete: true,
        },
      });
      setCompleted(true);
    } catch {
      setError("Relay could not save your choice. Try again.");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-lg p-5 sm:max-w-5xl sm:p-7"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Welcome to Relay</p>
          <DialogTitle className="text-2xl sm:text-3xl">Choose how you want to start</DialogTitle>
          <DialogDescription>Free is ready now. Creator and Studio will open soon.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-3">
          {welcomePlans.map((plan) => (
            <section
              key={plan.name}
              className={cn(
                "flex min-h-72 flex-col rounded-md border bg-card p-5 text-card-foreground",
                plan.available ? "border-foreground" : "border-border text-muted-foreground",
              )}
            >
              <span className="w-fit rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
                {plan.available ? "Available now" : "Coming soon"}
              </span>
              <h2 className="mt-4 text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 text-2xl font-semibold text-foreground">{plan.price}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.description}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="size-4" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant={plan.available ? "default" : "outline"}
                disabled={!plan.available || saving}
                className="mt-auto"
                onClick={plan.available ? () => void continueWithFree() : undefined}
              >
                {plan.available ? (saving ? "Starting..." : "Continue with Free") : "Coming soon"}
              </Button>
            </section>
          ))}
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <p className="text-center text-xs text-muted-foreground">Clerk manages your plan and billing. Change plans later from the top bar.</p>
      </DialogContent>
    </Dialog>
  );
}
