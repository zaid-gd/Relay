import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import {
  ClerkPricingPlans,
  SubscriptionPricingView,
  UserBillingProfile,
  type WorkspaceSubscriptionState,
} from "./subscription-plans";

vi.mock("@clerk/nextjs", () => ({
  PricingTable: (props: Record<string, unknown>) => (
    <div
      data-clerk-pricing-table
      data-for={props.for}
      data-highlighted-plan={props.highlightedPlan}
      data-redirect={props.newSubscriptionRedirectUrl}
    />
  ),
  UserProfile: () => <div data-clerk-user-profile />,
  useUser: () => ({ isLoaded: true, isSignedIn: false, user: null }),
}));

const freeSubscription = {
  clerkOrganizationId: "org_workspace",
  plan: "free",
  billingPeriod: null,
  subscriptionStatus: "free",
  trialEndsAt: null,
  reconciliationState: "synced",
  editorSeatAllowance: 1,
  storageQuotaBytes: 0,
  billingHealthy: true,
  blockedReasons: [],
  capabilities: {
    fileUploads: false,
    customWorkflowTemplates: false,
    advancedReports: false,
    salaryPlans: false,
    customPortalBranding: false,
    clientHub: false,
    teamFeatures: false,
  },
  canManageBilling: true,
} satisfies WorkspaceSubscriptionState;

const unhealthyStates = [
  ["past_due", "Payment needs attention"],
  ["canceled", "Subscription canceled"],
] satisfies ReadonlyArray<
  readonly [WorkspaceSubscriptionState["subscriptionStatus"], string]
>;

describe("User subscription pricing", () => {
  test("uses Clerk User pricing", () => {
    const html = renderToStaticMarkup(
      <ClerkPricingPlans subscription={freeSubscription} />
    );

    expect(html).toContain('data-for="user"');
    expect(html).toContain('data-highlighted-plan="creator_plan"');
    expect(html).toContain('data-redirect="/subscription?checkout=return"');
  });

  test("shows User pricing without an Organization or Workspace", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView checkoutReturned={false} />
    );

    expect(html).toContain("data-clerk-pricing-table");
    expect(html).toContain("Choose your Relay plan");
  });

  test("uses Clerk UserProfile for billing management", () => {
    const html = renderToStaticMarkup(<UserBillingProfile />);

    expect(html).toContain("data-clerk-user-profile");
  });

  test("shows a confirmed Creator trial without reading Clerk markup", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        checkoutReturned={false}
        subscription={{
          ...freeSubscription,
          plan: "creator",
          subscriptionStatus: "trialing",
          trialEndsAt: "2026-09-08T00:00:00.000Z",
        }}
      />
    );

    expect(html).toContain("Creator trial active");
    expect(html).toContain("Trial ends");
  });

  test("treats checkout return as unconfirmed until Convex changes", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        checkoutReturned
        subscription={freeSubscription}
      />
    );

    expect(html).toContain("Checking for a confirmed subscription update");
    expect(html).toContain(
      "Paid access stays locked until Relay verifies Clerk"
    );
    expect(html).not.toContain("Payment succeeded");
  });

  test.each(unhealthyStates)(
    "shows the %s billing state",
    (subscriptionStatus, copy) => {
      const html = renderToStaticMarkup(
        <SubscriptionPricingView
          checkoutReturned={false}
          subscription={{
            ...freeSubscription,
            subscriptionStatus,
            billingHealthy: false,
          }}
        />
      );

      expect(html).toContain(copy);
    }
  );
});
