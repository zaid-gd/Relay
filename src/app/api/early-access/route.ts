import { NextRequest, NextResponse } from "next/server";
import {
  EARLY_ACCESS_COOKIE_MAX_AGE_SECONDS,
  EARLY_ACCESS_COOKIE_NAME,
  createEarlyAccessToken,
  getEarlyAccessPassword,
  passwordsMatch,
} from "@/lib/early-access";

export const runtime = "nodejs";

function json(message: string, status: number) {
  return NextResponse.json(
    { message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function POST(request: NextRequest) {
  const expectedPassword = getEarlyAccessPassword();
  if (!expectedPassword) {
    return json("The early access lock has not been configured.", 503);
  }

  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return json("This request could not be verified.", 403);
  }

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return json("Enter the early access password.", 400);
  }

  if (typeof password !== "string" || password.length > 256) {
    return json("Enter the early access password.", 400);
  }

  if (!(await passwordsMatch(password, expectedPassword))) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return json("That password is not correct.", 401);
  }

  const response = json("Access granted.", 200);
  response.cookies.set({
    name: EARLY_ACCESS_COOKIE_NAME,
    value: await createEarlyAccessToken(expectedPassword),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: EARLY_ACCESS_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
