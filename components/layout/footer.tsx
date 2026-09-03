import Link from "next/link";
import { CATEGORIES } from "@/data/categories";
import { SITE_NAME } from "@/lib/constants";
import { ThemeToggle } from "@/components/layout/theme-toggle";

/**
 * Uma faixa só, aberta por uma frase em vez de um logotipo.
 * As três barras empilhadas anteriores liam como barra de ferramentas.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border-strong">
      <div className="shell grid gap-16 py-24 lg:grid-cols-[1.3fr_1fr] lg:gap-24">
        <div>
          <p className="max-w-lg font-display text-heading-2 leading-snug">
            A gente imprime em São Paulo e embala na mesma bancada onde a peça
            nasceu.
          </p>

          <p className="mt-10 max-w-md text-body-small text-secondary">
            Frete grátis acima de R$ 400. Trocas por defeito de fabricação em até
            7 dias — os detalhes estão nas{" "}
            <Link href="/politicas" className="nav-link text-primary">
              políticas
            </Link>
            .
          </p>

          <p className="mt-6 max-w-md text-body-small text-secondary">
            Vila Madalena, São Paulo. Passe para ver as peças de perto — combine
            antes pelo WhatsApp.
          </p>

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-body-small">
            <a
              href="mailto:ola@forma.estudio"
              className="nav-link text-primary"
            >
              ola@forma.estudio
            </a>
            <a
              href="https://www.instagram.com/c3dcriativ/"
              target="_blank"
              rel="noreferrer"
              className="nav-link text-primary"
            >
              Instagram
            </a>
            <a
              href="https://wa.me/5500000000000"
              target="_blank"
              rel="noreferrer"
              className="nav-link text-primary"
            >
              WhatsApp
            </a>
          </div>
        </div>

        <div className="grid gap-12 sm:grid-cols-2">
          <nav aria-label="Loja">
            <p className="label text-tertiary">Coleções</p>
            <ul className="mt-5 space-y-3">
              {CATEGORIES.slice(0, 5).map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/colecoes/${category.slug}`}
                    className="text-body-small text-secondary transition-colors duration-300 hover:text-primary"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Estúdio">
            <p className="label text-tertiary">Estúdio</p>
            <ul className="mt-5 space-y-3">
              {[
                { href: "/#processo", label: "Como isso vira objeto" },
                { href: "/personalizados", label: "Encomendas" },
                { href: "/colecoes", label: "Tudo que está pronto" },
                { href: "/politicas", label: "Prazos e cuidados" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-body-small text-secondary transition-colors duration-300 hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <div className="shell flex flex-col justify-between gap-2 border-t border-border-subtle py-8 text-body-small text-tertiary sm:flex-row">
        <p>
          © {year} {SITE_NAME} Estúdio de impressão 3D
        </p>
        <div className="flex gap-8">
          <p className="italic">Feito à mão, camada por camada</p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
