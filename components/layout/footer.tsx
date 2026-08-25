import Link from "next/link";
import { Instagram, MapPin, Twitter } from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import { SITE_NAME } from "@/lib/constants";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-surface">
      <div className="shell grid gap-12 pb-16 pt-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-heading-3 tracking-tight text-primary">
            FORMA<span className="text-accent">.</span>
          </p>
          <p className="mt-4 max-w-xs text-body-small leading-relaxed text-secondary">
            Estúdio de impressão 3D premium. Cada peça é produzida sob demanda,
            verificada à mão e entregue com o cuidado de quem entende que
            objetos também contam histórias.
          </p>
          <div className="mt-6 flex gap-2">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="flex size-10 items-center justify-center rounded-md border border-border-strong text-secondary transition-colors hover:border-accent hover:text-accent"
            >
              <Instagram size={18} />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Twitter / X"
              className="flex size-10 items-center justify-center rounded-md border border-border-strong text-secondary transition-colors hover:border-accent hover:text-accent"
            >
              <Twitter size={18} />
            </a>
          </div>
        </div>

        <nav aria-label="Loja">
          <p className="text-caption uppercase text-tertiary">Loja</p>
          <ul className="mt-4 space-y-3">
            {CATEGORIES.slice(0, 5).map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/colecoes/${category.slug}`}
                  className="text-body-small text-secondary transition-colors hover:text-accent"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Estúdio">
          <p className="text-caption uppercase text-tertiary">Estúdio</p>
          <ul className="mt-4 space-y-3">
            <li>
              <Link
                href="/#processo"
                className="text-body-small text-secondary transition-colors hover:text-accent"
              >
                Nosso processo
              </Link>
            </li>
            <li>
              <Link
                href="/personalizados"
                className="text-body-small text-secondary transition-colors hover:text-accent"
              >
                Peças personalizadas
              </Link>
            </li>
            <li>
              <Link
                href="/colecoes"
                className="text-body-small text-secondary transition-colors hover:text-accent"
              >
                Todas as coleções
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <p className="text-caption uppercase text-tertiary">Contato</p>
          <ul className="mt-4 space-y-3 text-body-small text-secondary">
            <li>
              <a
                href="mailto:ola@forma.estudio"
                className="transition-colors hover:text-accent"
              >
                ola@forma.estudio
              </a>
            </li>
            <li className="flex items-start gap-1.5">
              <MapPin size={15} className="mt-0.5 shrink-0" />
              Vila Madalena, São Paulo — SP
            </li>
            <li>Seg–Sex, 9h às 18h</li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="shell flex flex-col items-center justify-between gap-2 py-6 text-micro uppercase tracking-wider text-tertiary sm:flex-row">
          <p>
            © {year} {SITE_NAME} Estúdio de Impressão 3D
          </p>
          <p>Feito camada por camada em São Paulo</p>
        </div>
      </div>
    </footer>
  );
}
