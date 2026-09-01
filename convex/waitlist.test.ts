/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("waitlist endpoint validates and deduplicates email addresses", async () => {
  process.env.WAITLIST_PROXY_SECRET = "test-secret";
  const t = convexTest(schema, modules);
  const request = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-relay-proxy-signature": "test-secret",
    },
    body: JSON.stringify({
      name: "Maya Chen",
      email: " Maya@Aperture.co ",
      audience: "freelancer",
    }),
  };

  const first = await t.fetch("/api/waitlist", request);
  const duplicate = await t.fetch("/api/waitlist", request);
  const invalid = await t.fetch("/api/waitlist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-relay-proxy-signature": "test-secret",
    },
    body: JSON.stringify({
      name: "M",
      email: "not-an-email",
      audience: "team",
    }),
  });
  const rows = await t.run(async (ctx) =>
    ctx.db
      .query("waitlistSignups")
      .withIndex("by_email", (query) => query.eq("email", "maya@aperture.co"))
      .take(2)
  );

  expect(first.status).toBe(201);
  await expect(first.json()).resolves.toEqual({ kind: "joined" });
  expect(duplicate.status).toBe(200);
  await expect(duplicate.json()).resolves.toEqual({ kind: "already_joined" });
  expect(invalid.status).toBe(400);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    name: "Maya Chen",
    email: "maya@aperture.co",
    audience: "freelancer",
    status: "pending",
  });
});

test("waitlist endpoint rejects unsigned direct posts", async () => {
  process.env.WAITLIST_PROXY_SECRET = "test-secret";
  const t = convexTest(schema, modules);
  const response = await t.fetch("/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Unsigned User",
      email: "unsigned@example.com",
      audience: "team",
    }),
  });

  const rows = await t.run(async (ctx) =>
    ctx.db
      .query("waitlistSignups")
      .withIndex("by_email", (query) =>
        query.eq("email", "unsigned@example.com")
      )
      .take(1)
  );

  expect(response.status).toBe(401);
  expect(rows).toHaveLength(0);
});
