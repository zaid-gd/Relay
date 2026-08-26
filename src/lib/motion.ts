"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Hook that returns the user's reduced motion preference after hydration to avoid SSR mismatches.
 */
export function useHydratedReducedMotion() {
  const prefersReducedMotion = useReducedMotion();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(Boolean(prefersReducedMotion));
  }, [prefersReducedMotion]);

  return reducedMotion;
}
