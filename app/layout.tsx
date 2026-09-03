import type { Metadata, Viewport } from "next";
import { Fraunces, Karla } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/constants";
import "./globals.css";

// Karla: grotesca humanista, com irregularidades propositais no a, g e t.
// Substitui Inter — a fonte mais neutra e mais "produto de software" do catálogo.
const karla = Karla({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Fraunces: serifa variável com eixos SOFT e WONK — terminais arredondados
// e itálico levemente torto. Calor artesanal que Cormorant não tem.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Impressão 3D sob demanda`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Impressão 3D sob demanda`,
    description: SITE_DESCRIPTION,
    images: [{ url: "/images/og.svg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Impressão 3D sob demanda`,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EFE9DE" },
    { media: "(prefers-color-scheme: dark)", color: "#1B1A15" },
  ],
};

const themeScript = `
(function() {
  document.documentElement.classList.add('js');
  try {
    var theme = localStorage.getItem('forma-theme');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${karla.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-background font-sans text-primary antialiased">{children}</body>
    </html>
  );
}
