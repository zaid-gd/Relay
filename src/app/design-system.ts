export const cutlab = {
  color: {
    charcoal: "#000000",
    graphite: "#121212",
    softWhite: "#FFFFFF",
    teal: "#18181B",
    cyan: "#27272A",
    deepTeal: "#3F3F46",
    aqua: "#52525B",
    sky: "#71717A",
    indigo: "#A1A1AA",
    pink: "#D4D4D8",
    slate: "#18181B",
    steel: "#27272A",
    coolGray: "#71717A",
    mist: "#A1A1AA",
    success: "#22C55E",
    warning: "#FBBF24",
    error: "#EF4444",
    info: "#3B82F6"
  },
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16
  },
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 24,
    6: 32,
    7: 40,
    8: 48,
    9: 64,
    10: 80
  },
  shadow: {
    0: "none",
    1: "0 10px 30px rgba(0, 7, 10, 0.12)",
    2: "0 18px 48px rgba(0, 7, 10, 0.2)",
    3: "0 28px 80px rgba(0, 7, 10, 0.3)"
  },
  font: {
    heading: "var(--font-geist-sans), Geist, sans-serif",
    body: "var(--font-geist-sans), Geist, sans-serif"
  },
  typography: {
    display: "clamp(1.75rem, 1.4rem + 1.4vw, 2.5rem)",
    title: "clamp(1.25rem, 1.1rem + 0.5vw, 1.5rem)",
    body: "0.875rem",
    label: "0.75rem",
    lineBody: 1.5,
    lineTight: 1.2
  },
  motion: {
    fast: "120ms",
    base: "180ms",
    slow: "280ms",
    easeStandard: "cubic-bezier(0.2, 0, 0, 1)",
    easeOut: "cubic-bezier(0.16, 1, 0.3, 1)"
  },
  density: {
    compact: { controlHeight: 32, rowHeight: 34, sectionGap: 16 },
    comfortable: { controlHeight: 36, rowHeight: 40, sectionGap: 20 }
  }
} as const;
