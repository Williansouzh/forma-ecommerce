import Link from "next/link";

/**
 * O fecho da página: uma pergunta grande e dois caminhos. Sem parágrafo — a
 * essa altura quem rolou até aqui já leu tudo o que precisava.
 */
export function CTASection() {
  return (
    <section
      aria-labelledby="cta-titulo"
      className="ink gutter mt-[clamp(72px,14vh,170px)] py-[clamp(72px,15vh,180px)] text-center"
    >
      <h2
        id="cta-titulo"
        className="mx-auto max-w-[900px] font-display text-[clamp(34px,7vw,104px)] font-light leading-[0.98] tracking-[-0.03em]"
      >
        Tem uma ideia
        <br />
        <span className="type-outline italic">na cabeça?</span>
      </h2>

      <div className="mt-[clamp(30px,6vh,56px)] flex flex-wrap justify-center gap-3">
        <Link
          href="/personalizados"
          className="inline-flex min-h-[54px] items-center rounded-md bg-primary px-[30px] text-[14px] font-semibold text-background transition-colors duration-300 hover:bg-clay hover:text-primary"
        >
          Solicitar orçamento
        </Link>
        <Link
          href="/colecoes"
          className="inline-flex min-h-[54px] items-center rounded-md border border-border-strong px-[26px] text-[14px] font-medium text-primary transition-colors duration-300 hover:border-primary hover:bg-surface-muted"
        >
          Ver a coleção
        </Link>
      </div>
    </section>
  );
}
