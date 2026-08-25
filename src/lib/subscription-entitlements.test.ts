import { describe, expect, test } from "vitest";

import { planIncludesFileUploads } from "./subscription-entitlements";

describe("subscription entitlements", () => {
  test.each(["u:creator", "u:studio", "o:creator", "o:studio"])("allows uploads for %s", (claim) => {
    expect(planIncludesFileUploads(claim)).toBe(true);
  });

  test.each(["u:free", "free", "", undefined])("blocks uploads for %s", (claim) => {
    expect(planIncludesFileUploads(claim)).toBe(false);
  });
});
