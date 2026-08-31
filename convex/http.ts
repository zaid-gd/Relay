import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

type WaitlistAudience = "freelancer" | "team";

interface WaitlistInput {
  name: string;
  email: string;
  audience: WaitlistAudience;
}

const headers = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), { status, headers });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseWaitlistInput(value: unknown): WaitlistInput | null {
  if (!isRecord(value)) return null;

  const name = typeof value.name === "string" ? value.name.trim() : "";
  const email =
    typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const audience = value.audience;
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    name.length < 2 ||
    name.length > 80 ||
    email.length > 254 ||
    !validEmail.test(email) ||
    (audience !== "freelancer" && audience !== "team")
  ) {
    return null;
  }

  return { name, email, audience };
}

const http = httpRouter();

http.route({
  path: "/api/waitlist",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ kind: "invalid_request" }, 400);
    }

    const input = parseWaitlistInput(body);
    if (!input) return json({ kind: "invalid_request" }, 400);

    const result = await ctx.runMutation(internal.waitlist.join, input);
    return json(result, result.kind === "joined" ? 201 : 200);
  }),
});

export default http;
