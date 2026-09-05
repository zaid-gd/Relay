import type { Metadata } from "next";
import { EarlyAccessForm } from "./early-access-form";
import { EARLY_ACCESS_SITE_URL } from "@/lib/early-access";
import styles from "./early-access.module.css";

export const metadata: Metadata = {
  title: "Early access | Relay",
  description:
    "Relay is in early access. Enter the early access password or visit the public site.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function EarlyAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;

  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <section className={styles.card} aria-labelledby="early-access-heading">
        <a className={styles.brand} href={EARLY_ACCESS_SITE_URL}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/relay/lockup-accent.svg"
            width={320}
            height={100}
            alt="Relay"
          />
        </a>

        <p className={styles.eyebrow}>Relay early access</p>
        <h1 id="early-access-heading" className={styles.title}>
          <span>This workspace</span>
          <span>is locked.</span>
        </h1>
        <p className={styles.copy}>
          Relay is in a closed preview while we finish the product. Enter the
          early access password to continue, or head to the public site to learn
          more and join the waitlist.
        </p>

        <EarlyAccessForm returnTo={returnTo} />

        <div className={styles.divider} aria-hidden="true">
          <span>or</span>
        </div>

        <a className={styles.siteButton} href={EARLY_ACCESS_SITE_URL}>
          <span>Go to web.relay-app.cc.cd</span>
          <span aria-hidden="true">→</span>
        </a>

        <p className={styles.note}>
          This early access step is separate from your Relay account sign-in.
        </p>
      </section>
    </main>
  );
}
