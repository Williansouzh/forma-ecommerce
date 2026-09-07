import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

/**
 * As três objeções respondidas antes de qualquer outra coisa.
 *
 * O frete grátis morava na última linha do rodapé, em 11,5px, na mesma cor e
 * no mesmo tamanho do aviso de copyright — ou seja, o incentivo comercial mais
 * forte da loja tinha a menor prioridade visual disponível, e só era visto
 * depois que a pessoa desistiu.
 *
 * Sem ícone: caminhãozinho e etiqueta são o vocabulário do marketplace
 * genérico. Texto puro diz a mesma coisa e não parece template.
 */
export function UtilityBar() {
  const items = [
    { label: "Cada peça é impressa depois do pedido", priority: false },
    {
      label: `Frete grátis acima de ${formatPrice(FREE_SHIPPING_THRESHOLD)}`,
      priority: true,
    },
    { label: "Envio para todo o Brasil", priority: false },
  ];

  return (
    <div className="ink">
      <div className="shell flex min-h-9 items-center justify-center gap-x-8 gap-y-1 py-2 text-center text-[13px] text-secondary">
        {items.map((item) => (
          <span
            key={item.label}
            /* No celular sobra espaço para um só, e o que fica é o que
               move ticket médio. */
            className={item.priority ? "" : "hidden sm:inline"}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
