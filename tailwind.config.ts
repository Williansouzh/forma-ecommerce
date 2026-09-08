import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./stores/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
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
        // Igual a `tertiary` desde a troca de paleta: o quarto degrau reprovava
        // AA (3.22:1). Continua exportado só para não quebrar as chamadas.
        quaternary: "rgb(var(--text-quaternary-rgb) / <alpha-value>)",
        // Laranja de bancada: o único sinal cromático da interface.
        accent: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
          light: "#FF5A1F",
          dark: "#932D05",
        },
        clay: "rgb(var(--clay-rgb) / <alpha-value>)",
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
        // Bricolage Grotesque: grotesca variável com eixos de largura e óptico.
        // Substitui Fraunces, que era uma serifa de ateliê de cerâmica.
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        // Karla: grotesca humanista, mantida do sistema anterior.
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        // IBM Plex Mono: preço, medida e prazo. Alinha coluna e carrega bem
        // "0,12 mm" sem precisar escrever a palavra "especificação".
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "display-1": [
          "clamp(36px, 6vw, 88px)",
          { lineHeight: "1.02", letterSpacing: "-0.03em", fontWeight: "700" },
        ],
        "display-2": [
          "clamp(28px, 3.4vw, 40px)",
          { lineHeight: "1.08", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
        "heading-1": [
          "clamp(22px, 2.4vw, 28px)",
          { lineHeight: "1.18", letterSpacing: "-0.015em", fontWeight: "650" },
        ],
        "heading-2": [
          "24px",
          { lineHeight: "1.2", letterSpacing: "-0.012em", fontWeight: "650" },
        ],
        // Nome de produto.
        "heading-3": [
          "19px",
          { lineHeight: "1.25", letterSpacing: "-0.008em", fontWeight: "600" },
        ],
        "body-large": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        body: ["17px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-small": ["15px", { lineHeight: "1.5", fontWeight: "400" }],
        // Piso de 12px, e só para etiqueta em caixa alta. Nada de 10–11px:
        // o sistema anterior tinha texto de 10px em selo e no cartão do hero.
        caption: [
          "12px",
          { lineHeight: "1.35", letterSpacing: "0.12em", fontWeight: "600" },
        ],
        micro: [
          "12px",
          { lineHeight: "1.3", letterSpacing: "0.14em", fontWeight: "600" },
        ],
      },
      /*
       * Raio 0 na foto do produto (é objeto), 6px em controle e 8px em painel
       * (é interface). A distinção é o que faz o objeto parecer objeto.
       */
      borderRadius: {
        sm: "0px",
        md: "6px",
        lg: "8px",
        xl: "8px",
      },
      /*
       * Duas sombras no sistema inteiro, e só para o que de fato flutua:
       * drawer, dropdown, toast.
       */
      boxShadow: {
        sm: "0 1px 2px rgba(16,16,18,0.06)",
        md: "0 8px 20px -12px rgba(16,16,18,0.22)",
        lg: "0 16px 40px -16px rgba(16,16,18,0.30)",
        xl: "0 16px 40px -16px rgba(16,16,18,0.30)",
      },
      spacing: {
        // `h-13` era usado em quatro botões de "finalizar compra" e não existia
        // na escala: as classes saíam do build em silêncio e a altura vinha só
        // do `py-3.5`. 52px também é o piso de alvo de toque com folga.
        13: "3.25rem",
        120: "30rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        settle: {
          from: { opacity: "0", transform: "scale(1.03)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        // Aproximação lenta na foto do hero, só no desktop.
        slowzoom: {
          from: { transform: "scale(1.02)" },
          to: { transform: "scale(1.12)" },
        },
      },
      animation: {
        "fade-in": "fade-in 250ms cubic-bezier(0.2,0.6,0.3,1) both",
        "fade-up": "fade-up 500ms cubic-bezier(0.2,0.6,0.3,1) both",
        "slide-up": "slide-up 250ms cubic-bezier(0.2,0.6,0.3,1) both",
        settle: "settle 600ms cubic-bezier(0.2,0.6,0.3,1) both",
        breathe: "breathe 2.4s ease-in-out infinite",
        slowzoom:
          "slowzoom 20s cubic-bezier(0.2,0.6,0.3,1) infinite alternate both",
      },
    },
  },
  plugins: [],
};

export default config;
