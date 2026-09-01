import { createClerkClient } from "@clerk/nextjs/server";
import { clerkSetup } from "@clerk/testing/playwright";
import { cloudE2EAvailable, loadE2EEnvironment } from "./env";

export default async function globalSetup() {
  loadE2EEnvironment();
  if (!cloudE2EAvailable()) return;

  await clerkSetup({
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  });

  const email = process.env.E2E_CLERK_USER_EMAIL!;
  const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY!,
  });
  const existing = await clerkClient.users.getUserList({
    emailAddress: [email],
    limit: 1,
  });
  if (existing.data.length) return;

  try {
    await clerkClient.users.createUser({
      emailAddress: [email],
      username: "relay_e2e",
      firstName: "Relay",
      lastName: "E2E",
      skipPasswordRequirement: true,
      skipLegalChecks: true,
    });
  } catch (error) {
    const details =
      error && typeof error === "object" && "errors" in error
        ? JSON.stringify(error.errors, null, 2)
        : String(error);
    throw new Error(`Could not create the Clerk E2E user:\n${details}`, {
      cause: error,
    });
  }
}
