import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "var(--color-paper, #f7f4ed)",
          card: "var(--color-paper-2, #ffffff)",
          hover: "var(--color-paper-3, #eee9dc)",
          tint: "var(--color-paper-tint, #f0ebe0)",
        },
        rule: {
          DEFAULT: "var(--color-rule, #dfd8c8)",
          secondary: "var(--color-rule-2, #bcc6b1)",
        },
        ink: {
          DEFAULT: "var(--color-ink, #182615)",
          secondary: "var(--color-ink-2, #2d3e29)",
          muted: "var(--color-muted, #576750)",
          neutral: "var(--color-neutral, #41503b)",
        },
        botanical: {
          DEFAULT: "var(--color-accent, #265e2b)",
          hover: "var(--color-accent-hover, #1c4720)",
          light: "#eaf5eb",
          border: "#bde0c1",
        },
        terracotta: {
          DEFAULT: "var(--color-accent-2, #b04e33)",
          hover: "#943f27",
          light: "#faedea",
          border: "#f0c7be",
        },
        ochre: {
          DEFAULT: "#965a12",
          light: "#fdf5e6",
          border: "#f2dcba",
        },
      },
      fontFamily: {
        serif: ['var(--font-display, "Newsreader", "Fraunces", Georgia, serif)'],
        sans: ['var(--font-body, "Hanken Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)'],
        mono: ['var(--font-mono, "JetBrains Mono", ui-monospace, monospace)'],
      },
      boxShadow: {
        "card": "var(--shadow-card, 0 10px 30px -15px rgba(24, 38, 21, 0.08), 0 1px 3px rgba(24, 38, 21, 0.04))",
        "card-hover": "0 14px 34px -18px rgba(24, 38, 21, 0.14), 0 2px 4px rgba(24, 38, 21, 0.06)",
        "2xs": "0 1px 2px 0 rgba(24, 38, 21, 0.03)",
        "xs": "0 1px 3px 0 rgba(24, 38, 21, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;

