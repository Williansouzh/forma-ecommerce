import type { HomeImage, HomeMedia, LookbookImage } from "@/types/settings";

/**
 * As imagens da vitrine, com os valores de hoje como padrão.
 *
 * Estes eram literais dentro dos componentes. Passaram para cá porque agora
 * podem ser trocados pelo painel — e continuam sendo o que a loja mostra
 * enquanto ninguém trocar nada. Nenhuma migração, nenhuma tela que nasce
 * vazia, e apagar uma troca devolve a foto original.
 */
export const DEFAULT_HERO: HomeImage = {
  url: "/images/products/vaso-canelado-01.jpg",
  alt: "Vaso canelado verde impresso em 3D com flores, ao lado de porta-vela",
};

export const DEFAULT_LOOKBOOK: LookbookImage[] = [
  {
    url: "/images/products/cactos-03.jpg",
    alt: "Cactos impressos em 3D em fileira sobre estante",
    room: "Estante",
    place: "Catolé",
  },
  {
    url: "/images/products/vaso-canelado-02.jpg",
    alt: "Vaso canelado com flores sobre mesa de madeira",
    room: "Sala",
    place: "Bodocongó",
  },
  {
    url: "/images/products/suporte-02.jpg",
    alt: "Suporte de celular impresso em 3D na mesa de trabalho",
    room: "Home office",
    place: "Centro",
  },
  {
    url: "/images/products/dino-01.jpg",
    alt: "Mini dinossauros impressos em 3D com arco de exposição",
    room: "Quarto",
    place: "Alto Branco",
  },
  {
    url: "/images/products/vaso-nervura-02.jpg",
    alt: "Vaso nervurado rosa com bandeja",
    room: "Aparador",
    place: "Liberdade",
  },
  {
    url: "/images/products/painel-02.jpg",
    alt: "Painel de cores impresso em 3D em detalhe",
    room: "Ateliê",
    place: "Campina Grande",
  },
];

export const DEFAULT_ATELIER_POSTERS = {
  atelierHero: {
    url: "/images/products/painel-01.jpg",
    alt: "Impressora do ateliê trabalhando em uma peça",
  },
  atelierProcess: {
    url: "/images/products/suporte-03.jpg",
    alt: "Peça em produção, camada por camada",
  },
  atelierBench: {
    url: "/images/products/cactos-02.jpg",
    alt: "Bancada do ateliê durante o acabamento",
  },
} satisfies Record<string, HomeImage>;

/** Os slots que o painel oferece, na ordem em que aparecem na página. */
export const HOME_SLOTS = [
  { id: "hero", name: "Topo da home", hint: "Foto de tela cheia, a primeira coisa que se vê." },
  { id: "atelierHero", name: "Vídeo do topo (pôster)", hint: "Imagem parada enquanto não há vídeo." },
  { id: "atelierProcess", name: "Vídeo do processo (pôster)", hint: "Seção “como a peça nasce”." },
  { id: "atelierBench", name: "Vídeo da bancada (pôster)", hint: "Aparece na página do ateliê." },
] as const;
export type HomeSlotId = (typeof HOME_SLOTS)[number]["id"];

export interface ResolvedHomeMedia {
  hero: HomeImage;
  lookbook: LookbookImage[];
  atelierHero: HomeImage;
  atelierProcess: HomeImage;
  atelierBench: HomeImage;
}

/**
 * Junta o que está configurado com o padrão, campo a campo.
 *
 * A fusão é por CAMPO, não por objeto: trocar só a foto sem escrever o texto
 * alternativo mantém a descrição antiga — que descreveria a imagem errada.
 * Por isso um slot só é considerado trocado quando tem `url`, e o `alt` cai
 * para o padrão apenas quando vem vazio, nunca silenciosamente.
 *
 * Pura: recebe o que veio da API e devolve o que a página desenha.
 */
export function resolveHomeMedia(media?: HomeMedia): ResolvedHomeMedia {
  return {
    hero: pick(media?.hero, DEFAULT_HERO),
    lookbook: resolveLookbook(media?.lookbook),
    atelierHero: pick(media?.atelierHero, DEFAULT_ATELIER_POSTERS.atelierHero),
    atelierProcess: pick(media?.atelierProcess, DEFAULT_ATELIER_POSTERS.atelierProcess),
    atelierBench: pick(media?.atelierBench, DEFAULT_ATELIER_POSTERS.atelierBench),
  };
}

function pick(configured: HomeImage | undefined, fallback: HomeImage): HomeImage {
  const url = configured?.url?.trim();
  if (!url) return fallback;
  return { url, alt: configured?.alt?.trim() || fallback.alt };
}

/**
 * O lookbook é uma tira de seis: a seção duplica a lista para rolar sem
 * emenda, e menos fotos deixariam o laço curto e visível. Cada posição cai
 * para a foto padrão dela quando não foi trocada.
 */
function resolveLookbook(configured?: LookbookImage[]): LookbookImage[] {
  return DEFAULT_LOOKBOOK.map((fallback, index) => {
    const row = configured?.[index];
    const url = row?.url?.trim();
    if (!url) return fallback;
    return {
      url,
      alt: row?.alt?.trim() || fallback.alt,
      room: row?.room?.trim() || fallback.room,
      place: row?.place?.trim() || fallback.place,
    };
  });
}
