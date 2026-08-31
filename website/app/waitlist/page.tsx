"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import WaitlistForm from "../../components/WaitlistForm";
import BorderGlow from "../../components/react-bits/BorderGlow";
import MagicRings from "../../components/react-bits/MagicRings";

export default function WaitlistPage() {
  return (
    <main className="waitlist-page">
      <header className="waitlist-nav">
        <Link className="brand" href="/" aria-label="Relay home">
          <Image
            src="/brand/relay/lockup-accent.svg"
            width={320}
            height={100}
            alt="Relay"
            priority
          />
        </Link>
        <Link href="/">Back to Relay</Link>
      </header>

      <section className="waitlist-layout" aria-labelledby="waitlist-title">
        <motion.div
          className="waitlist-intro"
          initial={{ opacity: 0, y: -22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="eyebrow">Relay early access</p>
          <h1 id="waitlist-title">Test Relay before launch.</h1>
          <p>
            Join the waitlist to test the production workspace. We will email
            you when a spot opens.
          </p>
        </motion.div>

        <div className="waitlist-stage">
          <div className="waitlist-rings" aria-hidden="true">
            <MagicRings
              color="#c6ff00"
              colorTwo="#ffffff"
              speed={0.35}
              ringCount={7}
              attenuation={8}
              lineThickness={2}
              baseRadius={0.24}
              radiusStep={0.11}
              opacity={0.62}
              noiseAmount={0.02}
              ringGap={1.2}
              fadeIn={0.7}
              fadeOut={0.7}
              alphaMode="coverage"
            />
          </div>
          <BorderGlow
            className="waitlist-card-glow"
            edgeSensitivity={18}
            glowColor="78 100 36"
            backgroundColor="#070707"
            borderRadius={16}
            glowRadius={28}
            glowIntensity={0.6}
            coneSpread={24}
            colors={["#c6ff00", "#ffffff", "#8cffb3"]}
            fillOpacity={0.08}
            animated
          >
            <WaitlistForm />
          </BorderGlow>
        </div>
      </section>
    </main>
  );
}
