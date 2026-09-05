/** Palavras do ateliê passando na faixa escura, logo abaixo do hero. */
const WORDS = [
  "Sob medida",
  "Decoração",
  "Presentes",
  "Colecionáveis",
  "Impressão 3D",
  "Peça única",
];

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <div
      aria-hidden={hidden}
      className="flex items-center gap-[34px] whitespace-nowrap pr-[34px] font-display text-[15px] uppercase tracking-[0.14em]"
    >
      {WORDS.map((word) => (
        <span key={word} className="flex items-center gap-[34px]">
          {word}
          <span aria-hidden className="text-clay">
            ◦
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * A faixa é sempre escura, como a sidebar do painel — daí os hex literais em
 * vez dos tokens, que invertem no modo escuro. O conteúdo aparece duas vezes
 * porque a animação rola 50% e precisa reencontrar o mesmo ponto.
 */
export function MarqueeStrip() {
  return (
    <div
      style={{ background: "#1B1A15", color: "rgba(237, 230, 215, 0.8)" }}
      className="overflow-hidden border-t border-[rgba(237,230,215,0.1)] py-[15px]"
    >
      <div className="flex w-max animate-marquee">
        <Row />
        <Row hidden />
      </div>
    </div>
  );
}
