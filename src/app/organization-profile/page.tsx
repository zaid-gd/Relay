"use client";

import { useConvexAuth, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import { OrganizationBillingProfile } from "@/components/subscription-plans";

export default function OrganizationBillingProfileRoute() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const subscription = useQuery(
    api.workspaceSubscriptions.getCurrent,
    isAuthenticated ? {} : "skip"
  );

  if (isLoading) return null;
  return (
    <main className="min-h-dvh bg-black p-4 text-white md:p-8">
      {isAuthenticated ? (
        <OrganizationBillingProfile subscription={subscription} />
      ) : (
        <p>Sign in to manage Workspace billing.</p>
      )}
    </main>
  );
}
