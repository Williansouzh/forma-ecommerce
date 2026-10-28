export const SITE_NAME = "camada";

/**
 * Razão social e uso formal (nota fiscal, contrato, rodapé de e-mail).
 * O logotipo é sempre "camada." em caixa baixa; "Estúdio Camada" é para
 * quando o nome precisa se apresentar por extenso.
 */
export const SITE_LEGAL_NAME = "Estúdio Camada";

export const SITE_URL = "https://studiocamada.com";
export const SITE_DESCRIPTION =
  "Objetos de decoração, chaveiros e presentes feitos em pequena escala, camada por camada, com textura aparente e acabamento manual.";

export const FREE_SHIPPING_THRESHOLD = 40000;
export const SHIPPING_COST = 2990;
export const PIX_DISCOUNT = 0.05;

/** Fallback do painel enquanto as configurações do ateliê não vêm da API. */
export const ATELIER_PRINTERS = 4;

export const ATELIER_CITY = "Campina Grande — PB";

/*
 * Identificação exigida de toda loja online pelo Decreto 7.962/2013 (art. 2º):
 * CNPJ — ou CPF, para quem vende como pessoa física — e endereço físico.
 * Vazios, o rodapé simplesmente não mostra a linha; preencha antes de vender.
 */
export const LEGAL_DOCUMENT = "";
export const LEGAL_ADDRESS = "";
export const ATELIER_HOURS = "Seg a sáb · 8h às 18h";
/*
 * Os três valores abaixo ainda apontam para as contas antigas de propósito:
 * o e-mail e o @ do Instagram só trocam depois de criados. Trocar aqui antes
 * disso quebraria os links do rodapé em produção. Checklist da migração em
 * `docs/MARCA.md`.
 */
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
