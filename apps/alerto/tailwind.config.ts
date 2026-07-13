import type { Config } from "tailwindcss";

// Bantay Biñan government design system (ported from apps/web) so Bantay Alerto
// mirrors the Bantay Biñan look for the Office of Councilor Titus Bautista service.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#FECACA",
          500: "#DC2626",
          600: "#991B1B",
          700: "#B91C1C",
          800: "#7F1D1D",
          900: "#450A0A",
        },
        forest: {
          900: "#0F2E18",
          800: "#163D24",
          700: "#06280e",
          600: "#1A7530",
        },
        gold: {
          400: "#fad018",
          500: "#D4A800",
          600: "#F5C842",
        },
      },
      fontFamily: {
        sans:  ["var(--font-plex-sans)",  "system-ui", "sans-serif"],
        serif: ["var(--font-plex-serif)", "Georgia",   "serif"],
        mono:  ["var(--font-plex-mono)",  "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm:    "2px",
        DEFAULT: "3px",
        md:    "4px",
        lg:    "6px",
        xl:    "8px",
        "2xl": "12px",
        full:  "9999px",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.55s ease-out both",
        "fade-in":    "fadeIn 0.4s ease-out both",
        "slide-up":   "slideUp 0.4s ease-out both",
        blink:        "blink 1.4s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%":   { opacity: "0", transform: "translateY(28px)" },
          "100%": { opacity: "1", transform: "translateY(0)"    },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)"    },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.3" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
