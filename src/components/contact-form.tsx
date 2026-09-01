"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const fieldClass =
  "min-h-12 w-full rounded-md border border-[var(--app-strong-border)] bg-[var(--app-control)] px-3 py-2 text-base text-[var(--app-ink)] outline-none transition-colors placeholder:text-[var(--app-subtle)] focus:border-[var(--app-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-accent)_24%,transparent)]";

export function ContactForm() {
  const [status, setStatus] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supportEmail = "zns.stuioss@gmail.com";
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const message = String(form.get("message") || "").trim();
    const subject = encodeURIComponent(`Relay inquiry from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    );
    setStatus(
      "Opening your email app. Review the message there before sending."
    );
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  }

  return (
    <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Label className="text-base font-semibold" htmlFor="contact-name">
          Name
        </Label>
        <Input
          className={fieldClass}
          id="contact-name"
          name="name"
          autoComplete="name"
          required
          maxLength={120}
        />
      </div>
      <div className="grid gap-2">
        <Label className="text-base font-semibold" htmlFor="contact-email">
          Email
        </Label>
        <Input
          className={fieldClass}
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </div>
      <div className="grid gap-2">
        <Label className="text-base font-semibold" htmlFor="contact-message">
          How can we help?
        </Label>
        <Textarea
          className={`${fieldClass} min-h-36 resize-y`}
          id="contact-message"
          name="message"
          required
          maxLength={4000}
          aria-describedby="contact-message-help"
        />
        <p
          id="contact-message-help"
          className="text-sm text-[var(--app-muted)]"
        >
          Do not include passwords, API keys, or private client files.
        </p>
      </div>
      <div>
        <Button
          className="min-h-12 rounded-md bg-[var(--app-accent)] px-5 text-base font-semibold text-white transition-colors hover:bg-[var(--app-highlight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]"
          type="submit"
        >
          Prepare email
        </Button>
      </div>
      {status ? (
        <p
          className="text-sm leading-6 text-[var(--app-muted)]"
          role="status"
          aria-live="polite"
        >
          {status}
        </p>
      ) : null}
    </form>
  );
}
