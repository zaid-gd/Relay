"use client";

import { useMemo } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { DataProvider } from "@/lib/data-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { ClerkAuthBridge } from "@/lib/optional-auth";
import { FirstLoginPlanDialog } from "@/components/subscription-plans";

type ProvidersProps = {
  children: React.ReactNode;
  clerkPublishableKey?: string;
  convexUrl?: string;
};

function useLocalConvexAuth() {
  return {
    isLoading: false,
    isAuthenticated: false,
    fetchAccessToken: async () => null,
  };
}

const clerkAppearance = {
  options: {
    logoImageUrl: "/brand/relay/lockup-accent.svg",
    logoLinkUrl: "/",
  },
  variables: {
    borderRadius: "6px",
  },
  elements: {
    modalBackdrop: {
      alignItems: "center",
      display: "flex",
      justifyContent: "center",
      padding: "24px",
    },
    modalContent: {
      margin: "auto",
      maxHeight: "calc(100vh - 48px)",
    },
  },
};

const clerkLocalization = {
  signIn: {
    start: {
      title: "Sign in to Relay",
      titleCombined: "Sign in to Relay",
    },
  },
};

export function Providers({
  children,
  clerkPublishableKey,
  convexUrl,
}: ProvidersProps) {
  const hasConvexConfig = Boolean(convexUrl);
  const hasClerkConfig = Boolean(clerkPublishableKey);
  const hasCloudConfig = hasConvexConfig && hasClerkConfig;
  // Cloudflare runtime variables are not inlined into client bundles. The
  // server layout passes the public settings as props so hydration uses the
  // same values as the Worker render.
  const convex = useMemo(
    () =>
      new ConvexReactClient(convexUrl || "https://placeholder.convex.cloud"),
    [convexUrl]
  );

  const app = (
    <DataProvider
      mode={hasCloudConfig ? "cloud" : "local"}
      authEnabled={hasCloudConfig}
    >
      <TooltipProvider delayDuration={250}>
        {children}
        <Toaster
          className="relay-sonner"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--app-panel)",
              border: "1px solid var(--app-border)",
              color: "var(--app-ink)",
            },
          }}
        />
      </TooltipProvider>
    </DataProvider>
  );

  if (!hasCloudConfig) {
    return (
      <ConvexProviderWithAuth client={convex} useAuth={useLocalConvexAuth}>
        {app}
      </ConvexProviderWithAuth>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      appearance={clerkAppearance}
      localization={clerkLocalization}
    >
      <ClerkAuthBridge>
        {hasConvexConfig ? (
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            {app}
            <FirstLoginPlanDialog />
          </ConvexProviderWithClerk>
        ) : (
          <ConvexProviderWithAuth client={convex} useAuth={useLocalConvexAuth}>
            {app}
          </ConvexProviderWithAuth>
        )}
      </ClerkAuthBridge>
    </ClerkProvider>
  );
}
