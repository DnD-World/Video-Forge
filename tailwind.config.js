/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // The Forge look: near-black with the stravelakis panel blues in it.
        metal: {
          900: "#000000",
          800: "#03090c",
          700: "#071C26",
          600: "#0B2837",
          500: "#11374A",
        },
        // Accent glow — reads live CSS variables (set in index.css / by the
        // Appearance color picker) instead of a fixed hex, so switching the
        // color at runtime actually recolors every accent-* utility class.
        accent: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
          bright: "rgb(var(--accent-bright-rgb) / <alpha-value>)",
          deep: "rgb(var(--accent-deep-rgb) / <alpha-value>)",
        },
        speaker1: "#e8a24a",
        speaker2: "#4ac2e8",
      },
      fontFamily: {
        // Sora for every word — the Forge look (11 Oct 2026).
        display: ["'Sora'", "system-ui", "sans-serif"],
        mono: ["'Sora'", "ui-monospace", "monospace"],
        body: ["'Sora'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 12px rgb(var(--accent-rgb) / 0.55), 0 0 2px rgb(var(--accent-bright-rgb) / 0.9)",
        "glow-lg": "0 0 20px rgb(var(--accent-rgb) / 0.45), 0 0 4px rgb(var(--accent-bright-rgb) / 0.8)",
      },
    },
  },
  plugins: [],
};
