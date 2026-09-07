/** Uma imagem trocável da vitrine. */
export interface HomeImage {
  url: string;
  alt: string;
}

/** Uma foto do lookbook, com o cômodo e o bairro escritos sobre ela. */
export interface LookbookImage extends HomeImage {
  room: string;
  place: string;
}

/**
 * As imagens da home que o ateliê troca sozinho.
 *
 * Todo campo é opcional, e ausente significa "usa a imagem embutida na loja" —
 * não "sem imagem". É o que faz o recurso poder ser ligado sem mudar nada na
 * tela, e apagar uma troca devolver a foto original em vez de deixar buraco.
 */
export interface HomeMedia {
  hero?: HomeImage;
  lookbook?: LookbookImage[];
  atelierHero?: HomeImage;
  atelierProcess?: HomeImage;
  atelierBench?: HomeImage;
}

export interface StoreSettings {
  /** Em centavos. */
  freeShippingThreshold: number;
  pixDiscountPercent: number;
  defaultProductionDays: number;
  atelierName: string;
  atelierCity: string;
  atelierHours: string;
  homeMedia?: HomeMedia;
}
