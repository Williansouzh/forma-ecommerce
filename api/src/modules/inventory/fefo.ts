/**
 * FEFO — *first expired, first out*. A regra de qual lote sai primeiro, e o
 * cálculo de quanto sai de cada um, separados do banco de propósito: são
 * decisões puras, e decisão pura se testa com uma tabela em vez de um Mongo.
 */

/** O mínimo que o FEFO precisa saber de um lote. */
export interface FefoBatch {
  id: string;
  /** Quanto entrou no lote. */
  quantity: number;
  /** Quanto já saiu por venda. */
  consumed: number;
  /** Quanto já saiu por perda ou vencimento. */
  lost: number;
  /** Custo unitário em CENTAVOS, congelado no COGS quando o lote é consumido. */
  unitCost: number;
  /** Ausente = não vence. */
  expiresAt?: Date | null;
  /** Desempate estável entre lotes com a mesma validade (ou sem nenhuma). */
  createdAt: Date;
}

export interface FefoSlice {
  batchId: string;
  quantity: number;
  unitCost: number;
}

export interface FefoPlan {
  slices: FefoSlice[];
  /** Soma de `quantity * unitCost` das fatias. O COGS da venda. */
  cogs: number;
  /** O que não coube em lote nenhum. Maior que zero significa recusar. */
  shortfall: number;
}

export function remainingOf(batch: FefoBatch): number {
  return Math.max(0, batch.quantity - batch.consumed - batch.lost);
}

/** Um lote vencido não conta como disponível, mesmo com peça sobrando nele. */
export function isExpired(batch: FefoBatch, now: Date): boolean {
  return batch.expiresAt != null && batch.expiresAt.getTime() <= now.getTime();
}

/**
 * Ordem de saída: vence antes sai antes; lote SEM validade sai por último.
 *
 * A ordem crescente crua colocaria os sem validade na frente (o Mongo e o
 * JavaScript tratam ausência como menor que qualquer data), que é o oposto
 * do que FEFO quer: o lote que não vence é justamente o que pode esperar.
 */
export function sortForFefo(batches: FefoBatch[]): FefoBatch[] {
  return [...batches].sort((a, b) => {
    const aTime = a.expiresAt?.getTime();
    const bTime = b.expiresAt?.getTime();
    if (aTime != null && bTime != null && aTime !== bTime) return aTime - bTime;
    if (aTime != null && bTime == null) return -1;
    if (aTime == null && bTime != null) return 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

/**
 * Quanto tirar de cada lote para atender `quantity`, na ordem do FEFO.
 *
 * Não escreve nada e não lança: devolve o plano e o `shortfall`. Quem chama
 * decide o que fazer com a falta — e, no caminho da venda, decide recusar.
 */
export function planFefoConsumption(
  batches: FefoBatch[],
  quantity: number,
  now: Date = new Date(),
): FefoPlan {
  if (quantity <= 0) return { slices: [], cogs: 0, shortfall: 0 };

  const usable = sortForFefo(
    batches.filter((batch) => !isExpired(batch, now) && remainingOf(batch) > 0),
  );

  const slices: FefoSlice[] = [];
  let pending = quantity;
  let cogs = 0;

  for (const batch of usable) {
    if (pending === 0) break;
    const take = Math.min(pending, remainingOf(batch));
    slices.push({ batchId: batch.id, quantity: take, unitCost: batch.unitCost });
    cogs += take * batch.unitCost;
    pending -= take;
  }

  return { slices, cogs, shortfall: pending };
}

/** Peças presas em lote vencido — físicas, mas fora do disponível. */
export function expiredRemaining(batches: FefoBatch[], now: Date = new Date()): number {
  return batches
    .filter((batch) => isExpired(batch, now))
    .reduce((total, batch) => total + remainingOf(batch), 0);
}
