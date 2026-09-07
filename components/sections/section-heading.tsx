import Link from "next/link";

/**
 * O cabeçalho que abre cada seção: título e uma régua embaixo.
 *
 * A numeração 01–05 saiu. Ela sugeria uma sequência que a home não tem — as
 * seções não são etapas de nada, e o número precisava ser reescrito toda vez
 * que a ordem mudava. Onde existe sequência de verdade (as etapas do
 * processo), a contagem continua.
 */
export function SectionHeading({
  number,
  title,
  id,
  action,
  note,
}: {
  /** Só quando o conteúdo é de fato uma sequência. */
  number?: string;
  title: string;
  id?: string;
  /** Link à direita, na mesma linha de base do título. */
  action?: { href: string; label: string };
  /** Texto solto à direita, para quando não há para onde ir. */
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border-strong pb-5">
      <div className="flex items-baseline gap-4">
        {number && (
          <span className="data text-[13px] text-tertiary">{number}</span>
        )}
        <h2 id={id} className="font-display text-display-2">
          {title}
        </h2>
      </div>

      {action && (
        <Link
          href={action.href}
          className="nav-link text-body-small font-medium text-primary transition-colors duration-200 hover:text-accent"
        >
          {action.label}
        </Link>
      )}

      {note && <span className="text-body-small text-tertiary">{note}</span>}
    </div>
  );
}
