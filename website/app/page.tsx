"use client";

import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import InteractiveDashboard from "../components/InteractiveDashboard";
import ProductStory from "../components/ProductStory";
import BorderGlow from "../components/react-bits/BorderGlow";
import DecryptedText from "../components/react-bits/DecryptedText";
import FluidGlass from "../components/react-bits/FluidGlass";
import GradualBlur from "../components/react-bits/GradualBlur";
import LaserFlow from "../components/react-bits/LaserFlow";
import MagicRings from "../components/react-bits/MagicRings";
import SpecularButton from "../components/react-bits/SpecularButton";
import Threads from "../components/react-bits/Threads";

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
  const [loading, setLoading] = useState(true);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const headerWidth = useTransform(scrollY, [0, 260], ["90vw", "60vw"]);
  const headerHeight = useTransform(scrollY, [0, 260], [68, 56]);
  const [headerRef, headerInView] = useViewportEntry();
  const [threadsRef, threadsInView] = useViewportEntry();
  const [ringsRef, ringsInView] = useViewportEntry();
  const [laserRef, laserInView] = useViewportEntry();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => setLoading(false), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("is-site-loading", loading);
    return () => document.documentElement.classList.remove("is-site-loading");
  }, [loading]);

  return (
    <div className={loading ? "site is-loading" : "site is-ready"} id="top">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <motion.header
        className="site-header"
        style={
          reduceMotion
            ? { width: "90vw", height: 68 }
            : { width: headerWidth, height: headerHeight }
        }
      >
        <div ref={headerRef} className="nav-glass" aria-hidden="true">
          {headerInView && (
            <FluidGlass
              mode="bar"
              backgroundColor="#050505"
              showContent={false}
              barProps={{
                navItems: [],
                scale: 0.14,
                ior: 1.12,
                thickness: 7,
                chromaticAberration: 0.035,
              }}
            />
          )}
        </div>
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
          <SpecularButton className="nav-action" href="/waitlist">
            Join waitlist
          </SpecularButton>
        </nav>
      </motion.header>

      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div ref={threadsRef} className="hero-backdrop" aria-hidden="true">
            {!reduceMotion && threadsInView && (
              <Threads
                color={[0.82, 0.82, 0.85]}
                amplitude={0.55}
                distance={0.12}
              />
            )}
          </div>

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
              <SpecularButton className="hero-action" href="/waitlist">
                Join the waitlist
              </SpecularButton>
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

            <BorderGlow
              className="product-glow"
              edgeSensitivity={22}
              glowColor="75 100 50"
              backgroundColor="#09090b"
              borderRadius={18}
              glowRadius={24}
              glowIntensity={0.5}
              coneSpread={20}
              colors={["#c6ff00", "#ffffff", "#8cffb3"]}
              fillOpacity={0.08}
            >
              <div className="product-frame">
                <div className="dashboard-crop">
                  <InteractiveDashboard />
                </div>
              </div>
            </BorderGlow>
          </div>
        </section>

        <ProductStory />
      </main>

      <GradualBlur
        position="top"
        strength={2.8}
        height="4.5rem"
        divCount={8}
        curve="bezier"
        exponential
        target="page"
        zIndex={-85}
        className="page-top-blur"
      />

      <GradualBlur
        position="bottom"
        strength={2.7}
        height="4.5rem"
        divCount={9}
        curve="bezier"
        exponential
        target="page"
        zIndex={-20}
        className="page-scroll-blur"
      />

      <div
        className={`loading-screen ${loading ? "is-visible" : "is-leaving"}`}
        role="status"
        aria-label="Loading Relay"
      >
        <div className="loading-copy">
          <small>Starting production workspace</small>
          <DecryptedText
            text="LOADING RELAY"
            speed={42}
            sequential
            revealDirection="start"
            animateOn="view"
            characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ_01"
            className="loading-resolved"
            encryptedClassName="loading-encrypted"
            parentClassName="loading-decrypted"
          />
          <small>FRAME 041 / 068</small>
        </div>
      </div>
    </div>
  );
}
