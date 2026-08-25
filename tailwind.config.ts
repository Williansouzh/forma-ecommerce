import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./stores/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--bg-rgb) / <alpha-value>)",
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        "surface-muted": "rgb(var(--surface-muted-rgb) / <alpha-value>)",
        primary: "rgb(var(--text-primary-rgb) / <alpha-value>)",
        secondary: "rgb(var(--text-secondary-rgb) / <alpha-value>)",
        tertiary: "rgb(var(--text-tertiary-rgb) / <alpha-value>)",
        quaternary: "rgb(var(--text-quaternary-rgb) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
          light: "#E8A88C",
          dark: "#A0461C",
        },
        success: "#2D6A4F",
        error: "#B91C1C",
        warning: "#D97706",
        "border-subtle": "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
      },
      borderColor: {
        DEFAULT: "var(--color-border)",
        strong: "var(--color-border-strong)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      fontSize: {
        "display-1": [
          "clamp(52px, 8vw, 96px)",
          { lineHeight: "1.0", letterSpacing: "-0.03em", fontWeight: "500" },
        ],
        "display-2": [
          "clamp(34px, 5vw, 64px)",
          { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "500" },
        ],
        "heading-1": [
          "clamp(30px, 4vw, 48px)",
          { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "500" },
        ],
        "heading-2": [
          "32px",
          { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "500" },
        ],
        "heading-3": ["24px", { lineHeight: "1.3", fontWeight: "500" }],
        "body-large": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        body: ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-small": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: [
          "12px",
          { lineHeight: "1.4", letterSpacing: "0.05em", fontWeight: "500" },
        ],
        micro: [
          "11px",
          { lineHeight: "1.3", letterSpacing: "0.08em", fontWeight: "500" },
        ],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.04)",
        md: "0 4px 12px rgba(0,0,0,0.03)",
        lg: "0 8px 32px rgba(0,0,0,0.06)",
        xl: "0 16px 48px rgba(0,0,0,0.08)",
        glow: "0 0 40px rgba(199,91,42,0.15)",
      },
      spacing: {
        120: "30rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-18px)" },
        },
        "pulse-badge": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.3)" },
          "100%": { transform: "scale(1)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 300ms cubic-bezier(0.25,0.1,0.25,1) both",
        "fade-up": "fade-up 500ms cubic-bezier(0.25,0.1,0.25,1) both",
        "slide-up": "slide-up 300ms cubic-bezier(0.25,0.1,0.25,1) both",
        float: "float 6s ease-in-out infinite",
        "pulse-badge": "pulse-badge 400ms ease-out",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
