"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { safeReturnTo } from "@/lib/early-access";
import styles from "./early-access.module.css";

export function EarlyAccessForm({ returnTo }: { returnTo?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(result.message || "Access could not be verified.");
        return;
      }

      router.replace(safeReturnTo(returnTo));
      router.refresh();
    } catch {
      setMessage("Access could not be verified. Check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.label} htmlFor="early-access-password">
        Early access password
      </label>
      <div className={styles.controls}>
        <input
          id="early-access-password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          maxLength={256}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter password"
          className={styles.input}
          aria-describedby={message ? "early-access-message" : undefined}
          aria-invalid={message ? true : undefined}
        />
        <button type="submit" disabled={isSubmitting} className={styles.submit}>
          {isSubmitting ? "Checking…" : "Unlock"}
        </button>
      </div>
      <p
        id="early-access-message"
        className={styles.message}
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
    </form>
  );
}
