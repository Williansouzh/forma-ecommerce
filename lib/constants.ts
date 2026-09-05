export const SITE_NAME = "c3dcriativ";
export const SITE_URL = "https://c3dcriativ.com.br";
export const SITE_DESCRIPTION =
  "Objetos de decoração, chaveiros e presentes feitos em pequena escala, camada por camada, com textura aparente e acabamento manual.";

export const FREE_SHIPPING_THRESHOLD = 40000;
export const SHIPPING_COST = 2990;
export const PIX_DISCOUNT = 0.05;

/** Fallback do painel enquanto as configurações do ateliê não vêm da API. */
export const ATELIER_PRINTERS = 4;

export const ATELIER_CITY = "Campina Grande — PB";
export const ATELIER_HOURS = "Seg a sáb · 8h às 18h";
export const CONTACT_EMAIL = "ola@c3dcriativ.com.br";
export const INSTAGRAM_HANDLE = "@c3dcriativ";
export const INSTAGRAM_URL = "https://www.instagram.com/c3dcriativ/";

/** Só dígitos — é o formato que o `wa.me` e a API do WhatsApp esperam. */
export const WHATSAPP_NUMBER = "5583988717642";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export const NAV_LINKS = [
  { href: "/colecoes", label: "Coleção" },
  { href: "/personalizados", label: "Sob medida" },
  { href: "/atelier", label: "Ateliê" },
  { href: "/sobre", label: "Sobre" },
] as const;

// Termos que existem no catálogo — busca popular que não devolve nada é pior
// que não ter sugestão nenhuma.
export const POPULAR_SEARCHES = [
  "cactos",
  "vaso",
  "dragão",
  "suporte",
  "tag de pet",
  "dinos",
];
