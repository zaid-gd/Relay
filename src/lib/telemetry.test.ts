import { afterEach, describe, expect, it } from "vitest";
import {
  getAnalyticsConsent,
  optionalAnalyticsEnabled,
  redactTelemetry,
  reportEssentialError,
  setAnalyticsConsent,
  setTelemetryTransport,
  trackOptionalEvent,
} from "./telemetry";

describe("telemetry boundary", () => {
  afterEach(() => {
    setTelemetryTransport(undefined);
    setAnalyticsConsent("unknown");
  });

  it("defaults optional analytics to off", () => {
    expect(getAnalyticsConsent()).toBe("unknown");
    expect(optionalAnalyticsEnabled()).toBe(false);
  });

  it("does not send optional events until consent is granted", () => {
    const events: unknown[] = [];
    setTelemetryTransport((payload) => { events.push(payload); });

    trackOptionalEvent("weekly_return", { mode: "local" });
    expect(events).toHaveLength(0);

    setAnalyticsConsent("granted");
    trackOptionalEvent("weekly_return", { mode: "local" });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      channel: "analytics",
      event: "weekly_return",
      properties: { mode: "local" },
    });
  });

  it("redacts representative work data at the shared boundary", () => {
    const result = redactTelemetry({
      clientName: "Acme Client",
      projectTitle: "Project Apollo",
      commentBody: "Please change the ending",
      fileName: "client-cut.mp4",
      link: "https://example.test/project-token",
      portalToken: "secret-token",
      amount: 1250,
      safe: "local",
    });

    expect(JSON.stringify(result)).not.toMatch(/Acme Client|Project Apollo|change the ending|client-cut|example\.test|secret-token|1250/);
    expect(result).toMatchObject({ safe: "local" });
  });

  it("keeps essential error reporting independent from analytics consent", () => {
    const events: Array<Record<string, unknown>> = [];
    setTelemetryTransport((payload) => { events.push(payload as unknown as Record<string, unknown>); });

    setAnalyticsConsent("denied");
    reportEssentialError(new Error("Project Apollo comment at https://example.test/token costs $1250"));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ channel: "errors", event: "app_error", properties: { errorType: "Error" } });
    expect(JSON.stringify(events[0])).not.toMatch(/Project Apollo|example\.test|1250|comment/);
  });
});
