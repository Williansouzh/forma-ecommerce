import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-display text-display-1 tracking-tight text-quaternary">
        404
      </p>
      <h1 className="font-display text-heading-2 tracking-tight">
        Essa peça ainda não foi impressa
      </h1>
      <p className="max-w-sm text-body-small text-secondary">
        A página que você procura não existe ou saiu do catálogo. Explore as
        coleções para encontrar seu próximo objeto.
      </p>
      <Link
        href="/"
        className="inline-flex h-12 items-center rounded-md bg-accent px-8 text-body-small font-medium text-white transition-colors hover:bg-accent-dark"
      >
        Voltar para o início
      </Link>
    </div>
  );
}
