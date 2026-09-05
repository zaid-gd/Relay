"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import {
  motion,
  MotionConfig,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import InteractiveDashboard from "./InteractiveDashboard";
import ProductStory from "./ProductStory";
import SiteButton from "./SiteButton";

const LaserFlow = dynamic(() => import("./react-bits/LaserFlow"), {
  ssr: false,
});
const MagicRings = dynamic(() => import("./react-bits/MagicRings"), {
  ssr: false,
});

function useViewportEntry() {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry?.isIntersecting ?? false);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, isInView] as const;
}

export default function Home() {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const headerWidth = useTransform(scrollY, [0, 260], ["90vw", "60vw"]);
  const headerHeight = useTransform(scrollY, [0, 260], [68, 56]);
  const [ringsRef, ringsInView] = useViewportEntry();
  const [laserRef, laserInView] = useViewportEntry();

  return (
    <MotionConfig reducedMotion="user">
      <div className="site" id="top">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>

        <motion.header
          className="site-header"
          style={{
            width: reduceMotion ? "90vw" : headerWidth,
            height: reduceMotion ? 68 : headerHeight,
          }}
        >
          <a className="brand" href="#top" aria-label="Relay home">
            <Image
              src="/brand/relay/lockup-accent.svg"
              width={320}
              height={100}
              alt="Relay"
              priority
            />
          </a>
          <nav className="site-nav" aria-label="Main navigation">
            <a href="#product">Product</a>
            <a href="#pricing">Pricing</a>
            <SiteButton className="nav-action" href="/waitlist">
              Join the waitlist
            </SiteButton>
          </nav>
        </motion.header>

        <main id="main-content">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-message">
              <div className="hero-heading">
                <p className="eyebrow">
                  A production workspace for video editors
                </p>
                <h1 id="hero-title">
                  <span>Keep every edit</span>
                  <span>moving.</span>
                </h1>
              </div>
              <div className="hero-support">
                <p className="hero-copy">
                  Plan work, collect client feedback, and deliver the right cut
                  from one focused workspace.
                </p>
                <SiteButton className="hero-action" href="/waitlist">
                  Join the waitlist
                </SiteButton>
                <p className="hero-access-note">
                  Early access. Selected testers receive an email invite.
                </p>
              </div>
            </div>

            <div className="product-reveal" id="product">
              <div ref={ringsRef} className="magic-rings" aria-hidden="true">
                {!reduceMotion && ringsInView && (
                  <MagicRings
                    color="#c6ff00"
                    colorTwo="#f4f4f5"
                    ringCount={7}
                    speed={0.58}
                    attenuation={8}
                    lineThickness={2.2}
                    baseRadius={0.28}
                    radiusStep={0.12}
                    scaleRate={0.1}
                    opacity={0.92}
                    noiseAmount={0.025}
                    rotation={-8}
                    ringGap={1.28}
                    fadeIn={0.6}
                    fadeOut={0.7}
                    followMouse
                    mouseInfluence={0.08}
                    hoverScale={1.04}
                    parallax={0.025}
                  />
                )}
              </div>

              <div ref={laserRef} className="laser-flow" aria-hidden="true">
                {!reduceMotion && laserInView && (
                  <LaserFlow
                    color="#c6ff00"
                    backgroundColor="transparent"
                    horizontalBeamOffset={0}
                    verticalBeamOffset={-0.113}
                    horizontalSizing={0.49}
                    verticalSizing={5}
                    wispDensity={5}
                    wispSpeed={25.5}
                    wispIntensity={5.4}
                    flowSpeed={0.25}
                    flowStrength={0.16}
                    fogIntensity={1}
                    fogScale={0.3}
                    fogFallSpeed={0.6}
                    decay={2.18}
                    falloffStart={1.5}
                  />
                )}
              </div>

              <div className="product-glow">
                <div className="product-frame">
                  <div className="dashboard-crop">
                    <InteractiveDashboard />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <ProductStory />
        </main>
      </div>
    </MotionConfig>
  );
}
