import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

/**
 * Frete em número, sem simulação.
 *
 * O componente anterior pedia o CEP e devolvia "2 a 4 dias úteis" derivado do
 * primeiro dígito — um chute apresentado como cálculo, sem consultar
 * transportadora nenhuma. O frete aqui é fixo e a única coisa verdadeira a
 * dizer é o valor e quanto falta para ele zerar. O prazo real de cada peça
 * está no card e na página do produto.
 */
export function ShippingNote({ subtotal = 0 }: { subtotal?: number }) {
  const free = subtotal >= FREE_SHIPPING_THRESHOLD;
  const missing = FREE_SHIPPING_THRESHOLD - subtotal;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-3 text-body-small text-secondary">
        <span>Frete</span>
        <span className="tabular-nums">
          {free ? "Grátis" : formatPrice(SHIPPING_COST)}
        </span>
      </div>
      <p className="text-body-small text-tertiary">
        {free
          ? "Frete grátis liberado."
          : `Faltam ${formatPrice(missing)} para o frete grátis.`}
      </p>
    </div>
  );
}
