/**
 * Os fatos do ateliê que aparecem em mais de uma tela — home, Ateliê e Sobre.
 *
 * Ficam aqui em vez de repetidos em cada componente porque são a mesma
 * informação: se o ateliê comprar a quinta impressora, muda num lugar só.
 */

/** As etapas reais pelas quais toda peça passa, com o tempo de cada uma. */
export const PROCESS_STAGES = [
  { title: "Modelo digital", meta: "2 a 6 h" },
  { title: "Fatiamento", meta: "20 min" },
  { title: "Impressão", meta: "7 h · 0,12 mm" },
  { title: "Acabamento à mão", meta: "40 min" },
  { title: "Conferência e embalagem", meta: "15 min" },
];

export const ATELIER_NUMBERS = [
  { value: "4", label: "impressoras rodando" },
  { value: "1.200+", label: "peças entregues" },
  { value: "0,12 mm", label: "altura de camada" },
  { value: "2024", label: "primeira peça" },
];

/** O que usamos e por quê — a pergunta que mais chega pelo WhatsApp. */
export const MATERIALS = [
  {
    name: "PLA+ fosco",
    use: "O padrão da casa: cor sólida, toque acetinado e camada visível de perto. Serve para decoração, presentes e utilidades.",
    finish: "Lixado à mão",
    time: "3 a 5 dias",
  },
  {
    name: "PLA Silk",
    use: "Brilho acetinado que puxa reflexo de seda. Usamos nos vasos e nas peças que ficam contra a luz.",
    finish: "Sem lixa",
    time: "4 a 6 dias",
  },
  {
    name: "PETG",
    use: "Mais resistente a calor e queda. Vai em suportes, organizadores e peças que apanham no dia a dia.",
    finish: "Bordas chanfradas",
    time: "4 a 6 dias",
  },
  {
    name: "Resina",
    use: "Detalhe fino para colecionáveis e miniaturas: escama, dobra de tecido, rosto. Curada e lavada aqui.",
    finish: "Pintura opcional",
    time: "6 a 9 dias",
  },
];
