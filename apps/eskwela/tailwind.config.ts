import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["SF Mono", "JetBrains Mono", "Menlo", "monospace"],
      },
      colors: {
        surface: {
          0: "#0a0a0a",
          1: "#111111",
          2: "#161616",
          3: "#1e1e1e",
        },
        border: {
          DEFAULT: "#262626",
          subtle: "#1e1e1e",
        },
        fg: {
          DEFAULT: "#ededed",
          muted: "#737373",
          subtle: "#404040",
        },
        emergency: {
          DEFAULT: "#ef4444",
          dim: "rgba(239,68,68,0.12)",
          pulse: "rgba(239,68,68,0.35)",
        },
        amber: {
          DEFAULT: "#f59e0b",
          dim: "rgba(245,158,11,0.12)",
        },
        success: {
          DEFAULT: "#22c55e",
          dim: "rgba(34,197,94,0.12)",
        },
      },
      keyframes: {
        pulse_ring: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.6" },
          "50%": { transform: "scale(1.08)", opacity: "0" },
        },
        fade_in: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
      animation: {
        pulse_ring: "pulse_ring 1.8s ease-out infinite",
        fade_in: "fade_in 0.35s ease-out both",
        blink: "blink 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
