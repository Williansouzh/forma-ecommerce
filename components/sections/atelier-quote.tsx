/**
 * O respiro entre a vitrine e as coleções: uma frase sozinha, centralizada,
 * sem nada em volta. Existe para a página parar de vender por um instante.
 *
 * Os números são os do ateliê, não arredondamentos de marketing.
 */
export function AtelierQuote() {
  return (
    <section className="gutter mx-auto max-w-[1000px] py-[clamp(72px,15vh,190px)] text-center">
      <span aria-hidden className="mx-auto mb-[34px] block h-px w-[46px] bg-border-strong" />

      <p className="font-display text-[clamp(24px,3.6vw,46px)] font-light leading-[1.22] tracking-[-0.02em] text-pretty">
        Uma peça nossa leva em média{" "}
        <em className="italic text-accent">nove horas</em> de impressora e
        quarenta minutos de lixa. Nenhuma sai daqui sem ser olhada de perto.
      </p>

      <p className="mt-[30px] text-[11px] font-bold uppercase tracking-[0.3em] text-quaternary">
        c3dcriativ · ateliê de impressão
      </p>
    </section>
  );
}
