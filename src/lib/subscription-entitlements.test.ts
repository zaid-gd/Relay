import { describe, expect, test } from "vitest";

import { planIncludesFileUploads } from "./subscription-entitlements";

describe("subscription entitlements", () => {
  test.each(["u:creator", "o:creator", "o:team"])(
    "allows uploads for %s",
    (claim) => {
      expect(planIncludesFileUploads(claim)).toBe(true);
    }
  );

  test.each(["u:free", "u:studio", "free", "", undefined])(
    "blocks uploads for %s",
    (claim) => {
      expect(planIncludesFileUploads(claim)).toBe(false);
    }
  );
});
