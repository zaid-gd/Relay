"use client";

import { UserBillingProfile } from "@/components/subscription-plans";

export default function OrganizationBillingProfileRoute() {
  return (
    <main className="min-h-dvh bg-black p-4 text-white md:p-8">
      <UserBillingProfile />
    </main>
  );
}
