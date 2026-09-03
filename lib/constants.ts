export const SITE_NAME = "c3dcriativ";
export const SITE_URL = "https://c3dcriativ.com.br";
export const SITE_DESCRIPTION =
  "Objetos de decoração, chaveiros e presentes feitos em pequena escala, camada por camada, com textura aparente e acabamento manual.";

export const FREE_SHIPPING_THRESHOLD = 40000;
export const SHIPPING_COST = 2990;
export const PIX_DISCOUNT = 0.05;

/** Fallback do painel enquanto as configurações do ateliê não vêm da API. */
export const ATELIER_PRINTERS = 4;

export const NAV_LINKS = [
  { href: "/colecoes", label: "Coleções" },
  { href: "/colecoes/presentes", label: "Presentes" },
  { href: "/personalizados", label: "Encomendas" },
  { href: "/#processo", label: "Estúdio" },
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
