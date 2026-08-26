export type AnalyticsConsent = "unknown" | "granted" | "denied";

export type ActivationMilestone =
  | "onboarding_dialog_viewed"
  | "workspace_mode_selected"
  | "sample_studio_opened"
  | "sample_project_opened"
  | "sample_studio_exited"
  | "first_project_created";

export type AnalyticsEventProperties = {
  activation: {
    milestone: ActivationMilestone;
    variant?: "control" | "v2";
    mode?: "local" | "account";
  };
  weekly_return: { mode: "local" | "account" };
  project_delivered: { mode: "local" | "account" };
  client_portal_opened: { result: "active" | "blocked" };
  comment_added: { surface: "team" | "portal" | "media" };
  salary_plan_used: { action: "create" | "update" | "archive" | "restore" };
  salary_batch_used: { action: "received" | "unreceived" | "correction_note" };
  storage_consumption: {
    provider: "local" | "convex" | "r2";
    usageBucket:
      | "empty"
      | "under_1mb"
      | "under_10mb"
      | "under_50mb"
      | "under_200mb"
      | "over_200mb";
  };
};

export type AnalyticsEventName = keyof AnalyticsEventProperties;

export type TelemetryEnvelope = {
  version: 1;
  channel: "analytics" | "errors";
  event: string;
  properties: Record<string, string>;
  installationId?: string;
  sentAt: string;
};

export type TelemetryTransport = (
  payload: TelemetryEnvelope
) => void | Promise<void>;

const CONSENT_KEY = "relay:analytics-consent:v1";
const INSTALLATION_KEY = "relay:analytics-installation:v1";
const FORBIDDEN_KEY =
  /client|project|comment|file|link|url|token|money|amount|earning|salary|note|body|name|email|phone|path|stack|message/i;
const FORBIDDEN_VALUE =
  /https?:\/\/|www\.|bearer\s|token|password|[€£$]\s?\d|\b\d+(?:\.\d{2})?\s?(?:usd|eur|gbp|inr|aed|sar)\b/i;

let runtimeConsent: AnalyticsConsent = "unknown";
let runtimeInstallationId = "";
let telemetryTransport: TelemetryTransport | undefined;

function browserStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `relay-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function installationId() {
  if (runtimeInstallationId) return runtimeInstallationId;
  const storage = browserStorage();
  const stored = storage?.getItem(INSTALLATION_KEY);
  runtimeInstallationId = stored || randomId();
  if (!stored) {
    try {
      storage?.setItem(INSTALLATION_KEY, runtimeInstallationId);
    } catch {
      // Telemetry must never affect core app behavior.
    }
  }
  return runtimeInstallationId;
}

export function getAnalyticsConsent(): AnalyticsConsent {
  if (runtimeConsent !== "unknown") return runtimeConsent;
  const stored = browserStorage()?.getItem(CONSENT_KEY);
  if (stored === "granted" || stored === "denied") runtimeConsent = stored;
  return runtimeConsent;
}

export function setAnalyticsConsent(consent: AnalyticsConsent) {
  runtimeConsent = consent;
  const storage = browserStorage();
  try {
    if (consent === "unknown") storage?.removeItem(CONSENT_KEY);
    else storage?.setItem(CONSENT_KEY, consent);
  } catch {
    // A blocked browser store should not block the workspace.
  }
}

export function optionalAnalyticsEnabled() {
  return getAnalyticsConsent() === "granted";
}

/**
 * Removes sensitive fields before a payload can cross the telemetry boundary.
 * Event producers still use the stricter typed allowlist above.
 */
export function redactTelemetry(value: unknown, key = ""): unknown {
  if (FORBIDDEN_KEY.test(key)) return "[redacted]";
  if (typeof value === "string")
    return FORBIDDEN_VALUE.test(value) ? "[redacted]" : value.slice(0, 160);
  if (typeof value === "number" || typeof value === "boolean" || value === null)
    return value;
  if (Array.isArray(value)) return value.map((item) => redactTelemetry(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([entryKey]) => !FORBIDDEN_KEY.test(entryKey))
        .map(([entryKey, entryValue]) => [
          entryKey,
          redactTelemetry(entryValue, entryKey),
        ])
    );
  }
  return undefined;
}

function safeProperties(value: Record<string, string | number | boolean>) {
  const redacted = redactTelemetry(value);
  if (!redacted || typeof redacted !== "object" || Array.isArray(redacted))
    return {};
  return Object.fromEntries(
    Object.entries(redacted).map(([key, entryValue]) => [
      key,
      String(entryValue),
    ])
  );
}

function endpoint(channel: TelemetryEnvelope["channel"]) {
  const configured =
    channel === "analytics"
      ? process.env.NEXT_PUBLIC_RELAY_ANALYTICS_ENDPOINT
      : process.env.NEXT_PUBLIC_RELAY_ERROR_ENDPOINT;
  if (!configured) return null;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function dispatch(
  channel: TelemetryEnvelope["channel"],
  event: string,
  properties: Record<string, string | number | boolean>,
  includeInstallationId: boolean
) {
  const payload: TelemetryEnvelope = {
    version: 1,
    channel,
    event,
    properties: safeProperties(properties),
    ...(includeInstallationId ? { installationId: installationId() } : {}),
    sentAt: new Date().toISOString(),
  };
  if (telemetryTransport) {
    try {
      const result = telemetryTransport(payload);
      if (result instanceof Promise) void result.catch(() => undefined);
    } catch {
      // Telemetry is best effort and must never break a user action.
    }
    return;
  }
  const target = endpoint(channel);
  if (!target || typeof window === "undefined") return;
  const body = JSON.stringify(payload);
  try {
    if (
      typeof navigator.sendBeacon === "function" &&
      navigator.sendBeacon(
        target,
        new Blob([body], { type: "application/json" })
      )
    )
      return;
  } catch {
    // Fall through to fetch when Beacon is unavailable.
  }
  void fetch(target, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export function setTelemetryTransport(
  transport: TelemetryTransport | undefined
) {
  telemetryTransport = transport;
}

export function trackOptionalEvent<EventName extends AnalyticsEventName>(
  event: EventName,
  properties: AnalyticsEventProperties[EventName]
) {
  if (!optionalAnalyticsEnabled()) return;
  dispatch("analytics", event, properties, true);
}

function safeErrorType(error: unknown) {
  const name = error instanceof Error ? error.name : "UnknownError";
  return [
    "Error",
    "TypeError",
    "RangeError",
    "AbortError",
    "ConvexError",
    "NetworkError",
  ].includes(name)
    ? name
    : "UnknownError";
}

/** Essential diagnostics remain separate from optional analytics and contain no raw error data. */
export function reportEssentialError(error: unknown) {
  dispatch("errors", "app_error", { errorType: safeErrorType(error) }, false);
}
