"use client";

import { useState, type FormEvent } from "react";
import SiteButton from "./SiteButton";

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; email: string }
  | { kind: "error"; message: string };

function isSuccessResponse(value: unknown) {
  if (typeof value !== "object" || value === null || !("kind" in value)) {
    return false;
  }
  return value.kind === "joined" || value.kind === "already_joined";
}

export default function WaitlistForm() {
  const [state, setState] = useState<FormState>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("name");
    const email = formData.get("email");
    const audience = formData.get("audience");
    const website = formData.get("website");

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      (audience !== "freelancer" && audience !== "team") ||
      typeof website !== "string"
    ) {
      setState({ kind: "error", message: "Check your details and try again." });
      return;
    }

    setState({ kind: "submitting" });
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, audience, website }),
      });
      const result: unknown = await response.json();

      if (!response.ok || !isSuccessResponse(result)) {
        throw new Error("Waitlist request failed");
      }

      setState({ kind: "success", email });
      form.reset();
    } catch {
      setState({
        kind: "error",
        message: "We could not save your request. Please try again.",
      });
    }
  }

  if (state.kind === "success") {
    return (
      <section
        className="waitlist-card waitlist-success"
        id="waitlist"
        role="status"
        aria-live="polite"
      >
        <p className="waitlist-kicker">Request received</p>
        <h2>You are on the list.</h2>
        <p>
          If selected, you will receive an invite at{" "}
          <strong>{state.email}</strong>.
        </p>
      </section>
    );
  }

  return (
    <form
      className="waitlist-card"
      id="waitlist"
      onSubmit={handleSubmit}
      aria-busy={state.kind === "submitting"}
    >
      <div className="waitlist-heading">
        <p className="waitlist-kicker">Early access</p>
        <h2>Request an invite</h2>
        <p>We will contact selected testers by email.</p>
      </div>

      <div className="waitlist-fields">
        <label>
          <span>Name</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            minLength={2}
            maxLength={80}
            required
          />
        </label>
        <label>
          <span>Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
      </div>

      <fieldset className="waitlist-audience">
        <legend>I work as</legend>
        <label>
          <input
            name="audience"
            type="radio"
            value="freelancer"
            defaultChecked
          />
          <span>Freelance editor</span>
        </label>
        <label>
          <input name="audience" type="radio" value="team" />
          <span>Small team</span>
        </label>
      </fieldset>

      <label className="waitlist-honeypot" aria-hidden="true">
        Website
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </label>

      <SiteButton
        className="waitlist-submit"
        type="submit"
        disabled={state.kind === "submitting"}
      >
        {state.kind === "submitting" ? "Sending request" : "Join the waitlist"}
      </SiteButton>

      <p className="waitlist-disclosure">
        Early access is still changing. Storage, plan limits, and some features
        may differ from the plans shown.
      </p>
      <p className="waitlist-disclosure">
        We use these details to manage early-access requests. Read our{" "}
        <a href="https://relay-app.cc.cd/privacy">privacy policy</a>. For
        questions or removal, email{" "}
        <a href="mailto:zns.studioss@gmail.com">zns.studioss@gmail.com</a>.
      </p>
      <p className="waitlist-status" role="status" aria-live="polite">
        {state.kind === "error" ? state.message : ""}
      </p>
    </form>
  );
}
