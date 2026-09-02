"use client";

import { PricingTable, UserProfile, useUser } from "@clerk/nextjs";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useState } from "react";

import { api } from "../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { shouldShowSubscriptionWelcome } from "@/lib/subscription-onboarding";

export type WorkspaceSubscriptionState = NonNullable<
  FunctionReturnType<typeof api.workspaceSubscriptions.getCurrent>
>;

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
    pricingTableCardFeaturesListItem:
      "min-h-11 border-b border-[var(--app-border)] py-3 last:border-b-0",
    pricingTableCardFooter: "mt-auto",
  },
};

const billingPurchasesEnabled =
  process.env.NEXT_PUBLIC_BILLING_PURCHASES_ENABLED === "true";

type BillingStatusContent = {
  title: string;
  body: string;
  variant: "destructive" | "secondary";
};

function getBillingStatus(
  checkoutReturned: boolean,
  subscription: WorkspaceSubscriptionState
): BillingStatusContent | null {
  if (subscription.subscriptionStatus === "past_due") {
    return {
      title: "Payment needs attention",
      body: "Relay is using safe Free limits until Clerk confirms payment.",
      variant: "destructive",
    };
  }
  if (subscription.subscriptionStatus === "canceled") {
    return {
      title: "Subscription canceled",
      body: "Existing work stays available. New paid access remains locked.",
      variant: "secondary",
    };
  }
  if (subscription.subscriptionStatus === "trialing") {
    return {
      title: "Creator trial active",
      body: subscription.trialEndsAt
        ? `Trial ends ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(subscription.trialEndsAt))}.`
        : "Clerk will manage the first charge when the trial ends.",
      variant: "secondary",
    };
  }
  if (checkoutReturned && subscription.plan === "free") {
    return {
      title: "Checking for a confirmed subscription update",
      body: "Paid access stays locked until Relay verifies Clerk.",
      variant: "secondary",
    };
  }
  if (subscription.reconciliationState === "pending") {
    return {
      title: "Setting up Workspace billing",
      body: "Free access remains available while Relay connects Clerk.",
      variant: "secondary",
    };
  }
  return null;
}

function BillingStatus({
  checkoutReturned,
  subscription,
}: {
  checkoutReturned: boolean;
  subscription: WorkspaceSubscriptionState;
}) {
  const status = getBillingStatus(checkoutReturned, subscription);

  if (!status) return null;
  return (
    <Card role="status" className="mb-4 rounded-none">
      <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{status.title}</p>
          <p className="text-sm text-muted-foreground">{status.body}</p>
        </div>
        <Badge variant={status.variant}>{subscription.plan}</Badge>
      </CardContent>
    </Card>
  );
}

export function SubscriptionPricingView({
  checkoutReturned,
  subscription,
}: {
  checkoutReturned: boolean;
  subscription?: WorkspaceSubscriptionState | null;
}) {
  return (
    <div className="min-h-[calc(100dvh-15rem)] p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {subscription ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Confirmed plan
            </span>
            <Badge variant="outline">{subscription.plan}</Badge>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            Choose your Relay plan
          </span>
        )}
        {billingPurchasesEnabled ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/account#billing">Manage billing in Clerk</Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled>
            Purchases paused
          </Button>
        )}
      </div>
      {subscription ? (
        <BillingStatus
          checkoutReturned={checkoutReturned}
          subscription={subscription}
        />
      ) : null}
      {!billingPurchasesEnabled ? (
        <p role="status" className="mb-4 text-sm text-muted-foreground">
          Plans are shown for reference. New subscriptions are paused.
        </p>
      ) : null}
      <div
        inert={!billingPurchasesEnabled}
        aria-disabled={!billingPurchasesEnabled}
      >
        <PricingTable
          for="user"
          highlightedPlan="creator_plan"
          collapseFeatures={false}
          ctaPosition="bottom"
          newSubscriptionRedirectUrl="/subscription?checkout=return"
          appearance={pricingAppearance}
          checkoutProps={{ appearance: pricingAppearance }}
        />
      </div>
    </div>
  );
}

export function ClerkPricingPlans({
  checkoutReturned = false,
  subscription,
}: {
  checkoutReturned?: boolean;
  subscription?: WorkspaceSubscriptionState | null;
}) {
  return (
    <SubscriptionPricingView
      checkoutReturned={checkoutReturned}
      subscription={subscription}
    />
  );
}

export function UserBillingProfile() {
  return <UserProfile routing="hash" />;
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
    })
  );

  async function continueToWorkspace() {
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
        className="sm:max-w-md"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Welcome to Relay</DialogTitle>
          <DialogDescription>
            Your Workspace starts on Free. The Workspace Owner can compare Clerk
            plans from Subscription settings.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void continueToWorkspace()}
          >
            {saving ? "Starting..." : "Continue to Workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
