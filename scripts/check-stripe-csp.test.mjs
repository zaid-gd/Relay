import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config.mjs";

test("Clerk checkout can load Stripe", async () => {
  const [{ headers }] = await nextConfig.headers();
  const csp = headers.find(
    ({ key }) => key === "Content-Security-Policy"
  )?.value;

  assert.match(csp, /script-src[^;]*https:\/\/js\.stripe\.com/);
  assert.match(csp, /frame-src[^;]*https:\/\/js\.stripe\.com/);
  assert.match(csp, /connect-src[^;]*https:\/\/api\.stripe\.com/);
});
