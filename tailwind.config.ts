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
        // Oliva: a cor estrutural da marca (links, réguas, hover, labels).
        accent: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
          light: "#8B9770",
          dark: "#414D31",
        },
        // Barro: acento raro. Um detalhe por tela, nunca botão cheio.
        clay: "rgb(var(--clay-rgb) / <alpha-value>)",
        // Estados de formulário apenas — não usar em status de produto.
        success: "rgb(var(--success-rgb) / <alpha-value>)",
        warning: "rgb(var(--warning-rgb) / <alpha-value>)",
        error: "rgb(var(--error-rgb) / <alpha-value>)",
        "border-subtle": "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
      },
      borderColor: {
        DEFAULT: "var(--color-border)",
        strong: "var(--color-border-strong)",
      },
      fontFamily: {
        // Fraunces: serifa variável de terminais macios. Peso 300–400, nunca 600.
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        // Karla: grotesca humanista. Substitui Inter, que é fonte de aplicativo.
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-1": [
          "clamp(48px, 7.5vw, 92px)",
          { lineHeight: "0.96", letterSpacing: "-0.022em", fontWeight: "300" },
        ],
        "display-2": [
          "clamp(32px, 4.6vw, 58px)",
          { lineHeight: "1.04", letterSpacing: "-0.018em", fontWeight: "300" },
        ],
        "heading-1": [
          "clamp(28px, 3.6vw, 44px)",
          { lineHeight: "1.1", letterSpacing: "-0.016em", fontWeight: "400" },
        ],
        "heading-2": [
          "30px",
          { lineHeight: "1.18", letterSpacing: "-0.012em", fontWeight: "400" },
        ],
        "heading-3": ["22px", { lineHeight: "1.28", fontWeight: "400" }],
        "body-large": ["18px", { lineHeight: "1.62", fontWeight: "400" }],
        body: ["17px", { lineHeight: "1.62", fontWeight: "400" }],
        "body-small": ["15px", { lineHeight: "1.55", fontWeight: "400" }],
        // Etiqueta: a sans do texto, aberta no tracking. Sem monoespaçada.
        caption: [
          "12px",
          { lineHeight: "1.4", letterSpacing: "0.16em", fontWeight: "600" },
        ],
        micro: [
          "11px",
          { lineHeight: "1.35", letterSpacing: "0.19em", fontWeight: "600" },
        ],
      },
      // Canto reto é o padrão. O círculo fica só para swatch de cor.
      borderRadius: {
        sm: "0px",
        md: "2px",
        lg: "3px",
        xl: "4px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(60,45,30,0.05)",
        md: "0 10px 24px -12px rgba(60,45,30,0.16)",
        lg: "0 24px 48px -20px rgba(60,45,30,0.20)",
        xl: "0 30px 60px -20px rgba(60,45,30,0.22)",
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
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Peça pousando: uma vez, no load. Sem loop.
        settle: {
          from: { opacity: "0", transform: "scale(1.04)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        "fade-in": "fade-in 300ms cubic-bezier(0.25,0.1,0.25,1) both",
        "fade-up": "fade-up 500ms cubic-bezier(0.25,0.1,0.25,1) both",
        "slide-up": "slide-up 300ms cubic-bezier(0.25,0.1,0.25,1) both",
        settle: "settle 1200ms cubic-bezier(0.25,0.1,0.25,1) both",
        breathe: "breathe 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
