import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Karla } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/constants";
import "./globals.css";

// Karla: grotesca humanista, com irregularidades propositais no a, g e t.
// Substitui Inter — a fonte mais neutra e mais "produto de software" do catálogo.
const karla = Karla({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Bricolage Grotesque: grotesca variável, com caráter no g e no R, sem virar
// fonte de aplicativo. Substitui Fraunces — uma serifa de peso 300 que, a
// 104px e com ruído por cima, fechava a abertura do "e".
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// IBM Plex Mono: preço, medida e prazo. Não é clichê técnico — é o que alinha
// a coluna de preço na grade e segura "0,12 mm" sem parecer texto corrido.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
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
    { media: "(prefers-color-scheme: light)", color: "#FBFBF9" },
    { media: "(prefers-color-scheme: dark)", color: "#131315" },
  ],
  /*
   * Com o padrão do Chrome no Android (`resizes-visual`), abrir o teclado não
   * encolhe o viewport de layout: uma gaveta em `100dvh` continua com a altura
   * inteira e o rodapé — "Salvar peça" no painel, "Adicionar à sacola" na
   * página do produto — fica atrás do teclado, fora de alcance.
   *
   * `resizes-content` faz o teclado encolher o layout, então o rodapé sobe
   * junto e os campos do formulário continuam roláveis.
   */
  interactiveWidget: "resizes-content",
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
      className={`${karla.variable} ${bricolage.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-background font-sans text-primary antialiased">{children}</body>
    </html>
  );
}
