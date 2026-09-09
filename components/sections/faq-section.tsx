import Link from "next/link";
import { Plus } from "lucide-react";
import {
  FREE_SHIPPING_THRESHOLD,
  PIX_DISCOUNT,
  SHIPPING_COST,
} from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { getWhatsappUrl } from "@/lib/settings";

/**
 * As cinco objeções que faltavam na home. Prazo, material, cor, troca e frete
 * existiam só dentro de `/politicas` e da página do produto — ou seja, depois
 * da decisão.
 *
 * Todo o texto vem do que a loja já pratica: as respostas de troca e produção
 * são as mesmas de `/politicas`, e os valores saem das mesmas constantes que o
 * carrinho usa. Nada de certificação, selo ou garantia que não exista.
 *
 * `<details>` nativo em vez de acordeão em JavaScript: já vem com teclado,
 * leitor de tela e busca da página funcionando.
 */
const FAQ = [
  {
    q: "Em quanto tempo minha peça fica pronta?",
    a: "A produção começa depois da confirmação do pagamento — nada fica em estoque parado. O prazo de cada peça aparece no card e na página do produto (hoje entre 2 e 7 dias) e não inclui o tempo de transporte.",
  },
  {
    q: "De que material são feitas?",
    a: "PLA e PLA+, em acabamento fosco, silk, gradient ou multicor, conforme a peça. O material usado aparece na página de cada produto.",
  },
  {
    q: "Posso escolher a cor?",
    a: "Pode. As cores disponíveis aparecem em bolinhas embaixo do preço, tanto na coleção quanto na página do produto. Em peças sob medida, a paleta é combinada antes de a impressora ligar.",
  },
  {
    q: "E se a peça chegar com defeito?",
    a: "Trocamos peças com defeito de fabricação comunicado em até 7 dias após o recebimento. Pequenas variações de textura, linhas de camada e tonalidade fazem parte do processo de impressão 3D.",
  },
  {
    q: "Quanto custa o frete?",
    a: `Enviamos para todo o Brasil por ${formatPrice(SHIPPING_COST)}, e o frete é grátis acima de ${formatPrice(FREE_SHIPPING_THRESHOLD)}. No Pix, ${Math.round(PIX_DISCOUNT * 100)}% de desconto no total.`,
  },
];

export async function FaqSection() {
  const whatsappUrl = await getWhatsappUrl();
  return (
    <section aria-labelledby="faq-titulo" className="section-rhythm shell">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border-strong pb-5">
        <h2 id="faq-titulo" className="font-display text-display-2">
          Antes de pedir
        </h2>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="nav-link text-body-small font-medium text-primary"
          >
            Falar no WhatsApp
          </a>
        )}
      </div>

      <div className="mt-2 max-w-[72ch]">
        {FAQ.map((item) => (
          <details
            key={item.q}
            className="group border-b border-border-subtle"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-body font-medium text-primary marker:content-none [&::-webkit-details-marker]:hidden">
              {item.q}
              <Plus
                size={18}
                strokeWidth={1.75}
                aria-hidden
                className="shrink-0 text-tertiary transition-transform duration-200 group-open:rotate-45"
              />
            </summary>
            <p className="pb-4 pr-8 text-body-small text-secondary">{item.a}</p>
          </details>
        ))}
      </div>

      <p className="mt-5 text-body-small text-tertiary">
        Prazos, trocas e cuidados por extenso em{" "}
        <Link href="/politicas" className="nav-link font-medium text-primary">
          prazos e cuidados
        </Link>
        .
      </p>
    </section>
  );
}
