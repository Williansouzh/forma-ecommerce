import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { fetchProducts } from "@/lib/api";
import { getFeaturedProducts } from "@/data/products";
import { ProductCard } from "@/components/product/product-card";
import { WHATSAPP_URL } from "@/lib/constants";

/**
 * O fecho da página.
 *
 * Antes era uma pergunta de 104px — "Tem uma ideia na cabeça?" — seguida de
 * "Solicitar orçamento", com cerca de 450px de vazio até o rodapé. Ou seja: o
 * último ponto de atenção da loja pedia uma conversa no WhatsApp em vez de
 * vender, e quem tinha rolado a página inteira saía sem ver um preço.
 *
 * Agora recolhe de duas formas — quatro peças com preço para quem está pronto,
 * e o contato para quem quer algo que não está no catálogo.
 */
function newestFirst(a: { createdAt: string | Date }, b: { createdAt: string | Date }) {
  const left = new Date(a.createdAt).getTime() || 0;
  const right = new Date(b.createdAt).getTime() || 0;
  return right - left;
}

export async function CTASection() {
  const all = await fetchProducts();
  const source = all.length > 0 ? all : getFeaturedProducts();
  const latest = [...source].sort(newestFirst).slice(0, 4);

  return (
    <section aria-labelledby="fecho-titulo" className="section-rhythm shell pb-[clamp(48px,7vw,80px)]">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border-strong pb-5">
        <h2 id="fecho-titulo" className="font-display text-display-2">
          Últimas que saíram da impressora
        </h2>
        <Link
          href="/colecoes"
          className="nav-link text-body-small font-medium text-primary"
        >
          Ver a coleção completa
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
        {latest.map((product) => (
          <ProductCard key={product.id} product={product} variant="grid" />
        ))}
      </div>

      {/* Para quem chegou até aqui e não achou: o caminho da encomenda, agora
          como alternativa e não como tese da página. */}
      <div className="ink mt-12 flex flex-wrap items-center justify-between gap-6 rounded-lg p-[clamp(24px,4vw,40px)]">
        <div className="min-w-0 flex-[1_1_min(100%,420px)]">
          <h3 className="font-display text-heading-1">
            Não achou? A gente modela.
          </h3>
          <p className="mt-2 max-w-[52ch] text-body-small text-secondary">
            Mande a referência pelo WhatsApp — foto, desenho ou só a descrição.
            Você recebe o orçamento e o prazo antes de a impressora ligar.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex min-h-12 items-center gap-2.5 rounded-md bg-primary px-6 text-[15px] font-semibold text-background transition-colors duration-200 hover:bg-accent"
          >
            Mandar minha ideia
            <ArrowRight
              size={17}
              strokeWidth={1.75}
              aria-hidden
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </a>
          <Link
            href="/personalizados"
            className="inline-flex min-h-12 items-center rounded-md border border-border-strong px-6 text-[15px] font-medium text-primary transition-colors duration-200 hover:border-primary"
          >
            Como funciona
          </Link>
        </div>
      </div>
    </section>
  );
}
