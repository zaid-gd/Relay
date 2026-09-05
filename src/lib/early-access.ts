export const EARLY_ACCESS_COOKIE_NAME = "relay_early_access";
export const EARLY_ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const EARLY_ACCESS_SITE_URL = "https://web.relay-app.cc.cd";

const TOKEN_VERSION = "v1";
const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sign(value: string, password: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value)
  );
  return toBase64Url(new Uint8Array(signature));
}

export function getEarlyAccessPassword() {
  const primary = process.env.EARLY_ACCESS_PASSWORD?.trim();
  if (primary) return primary;
  return process.env.ACCESS_WALL_PASSWORD?.trim() || null;
}

export async function passwordsMatch(candidate: string, expected: string) {
  const [candidateHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(candidateHash);
  const right = new Uint8Array(expectedHash);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

export async function createEarlyAccessToken(
  password: string,
  now = Date.now()
) {
  const expiresAt =
    Math.floor(now / 1000) + EARLY_ACCESS_COOKIE_MAX_AGE_SECONDS;
  const payload = `${TOKEN_VERSION}.${expiresAt}`;
  return `${payload}.${await sign(payload, password)}`;
}

export async function verifyEarlyAccessToken(
  token: string | undefined,
  password: string,
  now = Date.now()
) {
  if (!token) return false;

  const [version, rawExpiry, suppliedSignature, extra] = token.split(".");
  if (
    version !== TOKEN_VERSION ||
    !rawExpiry ||
    !suppliedSignature ||
    extra !== undefined
  ) {
    return false;
  }

  const expiresAt = Number(rawExpiry);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) {
    return false;
  }

  const expectedSignature = await sign(`${version}.${rawExpiry}`, password);
  return passwordsMatch(suppliedSignature, expectedSignature);
}

export function safeReturnTo(value: string | null | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}
