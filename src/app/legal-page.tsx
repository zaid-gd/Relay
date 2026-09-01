import Link from "next/link";
import type { ReactNode } from "react";
import { RelayBrand } from "./relay-brand";
import styles from "./legal-page.module.css";

type LegalSection = { title: string; body: ReactNode };
type LegalPageProps = {
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
};

export function LegalPage({
  title,
  updatedAt,
  intro,
  sections,
}: LegalPageProps) {
  return (
    <main className={styles.page} id="main-content">
      <div className={styles.shell}>
        <header className={styles.header}>
          <RelayBrand compact className={styles.brand} />
          <nav aria-label="Support and legal pages" className={styles.nav}>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/accessibility">Accessibility</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </header>

        <article className={styles.card}>
          <div className={styles.hero}>
            <p className={styles.eyebrow}>RELAY DOCUMENTATION</p>
            <h1>{title}</h1>
            <p className={styles.intro}>{intro}</p>
            <p className={styles.updated}>
              Last updated <time>{updatedAt}</time>
            </p>
          </div>
          <div className={styles.content}>
            {sections.map((section) => (
              <section key={section.title} className={styles.section}>
                <h2>{section.title}</h2>
                <div className="legal-copy">{section.body}</div>
              </section>
            ))}
          </div>
        </article>

        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} Relay</span>
          <Link href="/">Back to Relay</Link>
        </footer>
      </div>
    </main>
  );
}
