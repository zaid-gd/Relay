import { NextResponse } from "next/server";

type WaitlistAudience = "freelancer" | "team";

interface WaitlistInput {
  name: string;
  email: string;
  audience: WaitlistAudience;
  website: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseInput(value: unknown): WaitlistInput | null {
  if (!isRecord(value)) return null;

  const name = typeof value.name === "string" ? value.name.trim() : "";
  const email =
    typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const website = typeof value.website === "string" ? value.website.trim() : "";
  const audience = value.audience;
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    name.length < 2 ||
    name.length > 80 ||
    email.length > 254 ||
    !validEmail.test(email) ||
    website.length > 200 ||
    (audience !== "freelancer" && audience !== "team")
  ) {
    return null;
  }

  return { name, email, audience, website };
}

function getConvexSiteUrl() {
  if (process.env.CONVEX_SITE_URL) return process.env.CONVEX_SITE_URL;

  const cloudUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  return cloudUrl?.endsWith(".convex.cloud")
    ? cloudUrl.replace(/\.convex\.cloud$/, ".convex.site")
    : null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ kind: "invalid_request" }, { status: 400 });
  }

  const input = parseInput(body);
  if (!input) {
    return NextResponse.json({ kind: "invalid_request" }, { status: 400 });
  }

  if (input.website) {
    return NextResponse.json({ kind: "joined" }, { status: 201 });
  }

  const siteUrl = getConvexSiteUrl();
  if (!siteUrl) {
    return NextResponse.json({ kind: "unavailable" }, { status: 503 });
  }

  try {
    const response = await fetch(new URL("/api/waitlist", siteUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        audience: input.audience,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const result: unknown = await response.json();

    if (!isRecord(result) || typeof result.kind !== "string") {
      return NextResponse.json({ kind: "unavailable" }, { status: 502 });
    }

    return NextResponse.json(result, { status: response.status });
  } catch {
    return NextResponse.json({ kind: "unavailable" }, { status: 502 });
  }
}
