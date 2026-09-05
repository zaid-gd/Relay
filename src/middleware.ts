import { NextRequest, NextResponse } from "next/server";
import {
  EARLY_ACCESS_COOKIE_NAME,
  getEarlyAccessPassword,
  safeReturnTo,
  verifyEarlyAccessToken,
} from "@/lib/early-access";

const PUBLIC_PATHS = new Set(["/early-access", "/api/early-access"]);

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

export default async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isStaticAsset(pathname) || PUBLIC_PATHS.has(pathname)) {
    // Allow the lock page itself to bounce authenticated users home.
    if (pathname === "/early-access") {
      const password = getEarlyAccessPassword();
      if (!password) return NextResponse.next();
      const token = request.cookies.get(EARLY_ACCESS_COOKIE_NAME)?.value;
      if (await verifyEarlyAccessToken(token, password)) {
        const returnTo = safeReturnTo(
          request.nextUrl.searchParams.get("returnTo")
        );
        return NextResponse.redirect(new URL(returnTo, request.url));
      }
    }
    return NextResponse.next();
  }

  const password = getEarlyAccessPassword();
  // Fail open when no password is configured so local dev keeps working.
  if (!password) return NextResponse.next();

  const token = request.cookies.get(EARLY_ACCESS_COOKIE_NAME)?.value;
  if (await verifyEarlyAccessToken(token, password)) {
    return NextResponse.next();
  }

  const lockUrl = new URL("/early-access", request.url);
  const returnTo = `${pathname}${search}`;
  if (returnTo !== "/") lockUrl.searchParams.set("returnTo", returnTo);
  return NextResponse.redirect(lockUrl);
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
