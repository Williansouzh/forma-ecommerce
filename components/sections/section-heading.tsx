import Link from "next/link";

/**
 * O cabeçalho numerado que abre cada seção da home: número miúdo, título em
 * serifa e uma régua embaixo. As seções são numeradas porque a home é lida em
 * ordem — o número diz onde a pessoa está, não decora.
 */
export function SectionHeading({
  number,
  title,
  id,
  action,
  note,
}: {
  number: string;
  title: string;
  id?: string;
  /** Link à direita, na mesma linha de base do título. */
  action?: { href: string; label: string };
  /** Texto solto à direita, para quando não há para onde ir. */
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border-strong pb-[22px]">
      <div className="flex items-baseline gap-4">
        <span className="text-micro font-bold text-quaternary">{number}</span>
        <h2 id={id} className="font-display text-display-2">
          {title}
        </h2>
      </div>

      {action && (
        <Link
          href={action.href}
          className="border-b border-accent/40 pb-[3px] text-caption uppercase text-primary transition-colors duration-300 hover:border-accent hover:text-accent"
        >
          {action.label}
        </Link>
      )}

      {note && <span className="text-caption uppercase text-quaternary">{note}</span>}
    </div>
  );
}
