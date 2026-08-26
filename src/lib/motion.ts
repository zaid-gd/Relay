"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

export function useHydratedReducedMotion() {
  const prefersReducedMotion = useReducedMotion();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(Boolean(prefersReducedMotion));
  }, [prefersReducedMotion]);

  return reducedMotion;
}
