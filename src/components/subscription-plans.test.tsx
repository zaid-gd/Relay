import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import {
  ClerkPricingPlans,
  OrganizationBillingProfile,
  SubscriptionPricingView,
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
  OrganizationProfile: () => <div data-clerk-organization-profile />,
  OrganizationSwitcher: () => <div data-clerk-organization-switcher />,
  useOrganization: () => ({
    isLoaded: true,
    organization: { id: "org_workspace" },
  }),
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

describe("Workspace subscription pricing", () => {
  test("uses Clerk Organization pricing for the active Workspace", () => {
    const html = renderToStaticMarkup(
      <ClerkPricingPlans subscription={freeSubscription} />
    );

    expect(html).toContain('data-for="organization"');
    expect(html).toContain('data-highlighted-plan="creator"');
    expect(html).toContain('data-redirect="/subscription?checkout=return"');
  });

  test("keeps checkout and management Owner-only", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        checkoutReturned={false}
        subscription={{ ...freeSubscription, canManageBilling: false }}
        activeOrganizationId="org_workspace"
      />
    );

    expect(html).not.toContain("data-clerk-pricing-table");
    expect(html).not.toContain("Manage billing in Clerk");
    expect(html).toContain("Only the Workspace Owner can change billing");
  });

  test("uses Clerk OrganizationProfile for Owner billing management", () => {
    const html = renderToStaticMarkup(
      <OrganizationBillingProfile subscription={freeSubscription} />
    );

    expect(html).toContain("data-clerk-organization-profile");
  });

  test("does not manage a different active Clerk Organization", () => {
    const html = renderToStaticMarkup(
      <SubscriptionPricingView
        checkoutReturned={false}
        subscription={freeSubscription}
        activeOrganizationId="org_other"
      />
    );

    expect(html).not.toContain("data-clerk-pricing-table");
    expect(html).toContain("data-clerk-organization-switcher");
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
        activeOrganizationId="org_workspace"
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
        activeOrganizationId="org_workspace"
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
          activeOrganizationId="org_workspace"
        />
      );

      expect(html).toContain(copy);
    }
  );
});
