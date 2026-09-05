/**
 * Os três slots de vídeo do ateliê (hero, processo e bancada). Enquanto o
 * `src` for `undefined`, cada slot mostra o poster parado — basta pôr o
 * arquivo em `public/videos/` e apontar aqui para o movimento entrar.
 */
export const ATELIER_MEDIA = {
  hero: {
    src: undefined as string | undefined,
    poster: "/images/products/painel-01.jpg",
    alt: "Impressora do ateliê trabalhando em uma peça",
  },
  process: {
    src: undefined as string | undefined,
    poster: "/images/products/suporte-03.jpg",
    alt: "Peça em produção, camada por camada",
  },
  bench: {
    src: undefined as string | undefined,
    poster: "/images/products/cactos-02.jpg",
    alt: "Bancada do ateliê durante o acabamento",
  },
} as const;
