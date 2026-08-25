import { describe, expect, test } from "vitest";

import { shouldShowSubscriptionWelcome } from "./subscription-onboarding";

describe("subscription welcome", () => {
  test("shows only during the account's first sign-in and stops after completion", () => {
    const createdAt = new Date("2026-08-25T00:00:00Z");

    expect(shouldShowSubscriptionWelcome({ completed: undefined, createdAt, lastSignInAt: new Date("2026-08-25T00:01:00Z") })).toBe(true);
    expect(shouldShowSubscriptionWelcome({ completed: true, createdAt, lastSignInAt: new Date("2026-08-25T00:01:00Z") })).toBe(false);
    expect(shouldShowSubscriptionWelcome({ completed: undefined, createdAt, lastSignInAt: new Date("2026-08-26T00:00:00Z") })).toBe(false);
  });
});
