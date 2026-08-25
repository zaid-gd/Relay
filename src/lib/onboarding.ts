import { trackOptionalEvent } from "./telemetry";

const variantKey = "cutlab-studio:onboarding-variant:v2";

export type OnboardingVariant = "control" | "v2";
export type OnboardingEvent =
  | "onboarding_dialog_viewed"
  | "sample_studio_opened"
  | "sample_project_opened"
  | "sample_studio_exited"
  | "workspace_mode_selected"
  | "first_project_created";

export function resolveOnboardingVariant(): OnboardingVariant {
  if (typeof window === "undefined") return "v2";
  const override = new URLSearchParams(window.location.search).get("onboarding");
  if (override === "control" || override === "v2") return override;
  const stored = window.localStorage.getItem(variantKey);
  if (stored === "control" || stored === "v2") return stored;
  const enabled = process.env.NEXT_PUBLIC_ONBOARDING_V2 !== "false";
  const variant: OnboardingVariant = enabled ? "v2" : "control";
  window.localStorage.setItem(variantKey, variant);
  return variant;
}

export function trackOnboardingEvent(
  event: OnboardingEvent,
  properties: { variant: OnboardingVariant; entrySource?: string; mode?: "local" | "account"; elapsedMs?: number },
) {
  trackOptionalEvent("activation", {
    milestone: event,
    variant: properties.variant,
    ...(properties.mode ? { mode: properties.mode } : {}),
  });
}
