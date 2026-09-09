import Link from "next/link";
import { Lock } from "lucide-react";
import {
  ATELIER_CITY,
  ATELIER_HOURS,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  SITE_NAME,
} from "@/lib/constants";
import { getStoreSettings, whatsappUrlFor } from "@/lib/settings";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const LOJA_LINKS = [
  { href: "/colecoes", label: "Coleção completa" },
  { href: "/personalizados", label: "Sob medida" },
  { href: "/atelier", label: "Ateliê" },
  { href: "/sobre", label: "Sobre nós" },
  { href: "/politicas", label: "Prazos e cuidados" },
];

/**
 * O rodapé fecha a página no mesmo escuro do CTA logo acima — juntos formam
 * um bloco só, e a transição some. Três colunas: quem somos, para onde ir,
 * onde ficamos.
 */
export async function Footer() {
  const year = new Date().getFullYear();
  // O número vem do painel; sem número, a linha do WhatsApp some.
  const settings = await getStoreSettings();
  const whatsappUrl = whatsappUrlFor(settings.whatsappNumber);

  return (
    <footer className="ink gutter pb-[30px] pt-[clamp(46px,9vh,100px)]">
      <div className="mx-auto flex w-full max-w-[1360px] flex-wrap gap-[clamp(26px,5vw,80px)]">
        <div className="flex-[1_1_min(100%,320px)]">
          <p className="font-display text-[clamp(26px,3.2vw,36px)] font-semibold tracking-[-0.02em]">
            {SITE_NAME}
            <span className="text-clay">.</span>
          </p>

          <p className="mt-3.5 max-w-[320px] text-body-small text-secondary">
            Objetos impressos em 3D, um por vez, em Campina Grande — PB.
            Transformando ideias em coisas que dá pra segurar.
          </p>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="nav-link mt-4 inline-block text-body-small font-semibold text-clay"
            >
              wa.me/{settings.whatsappNumber}
            </a>
          )}
        </div>

        <nav aria-label="Loja" className="flex-[1_1_160px]">
          <p className="label text-tertiary">Loja</p>
          <ul className="mt-3.5 space-y-[9px]">
            {LOJA_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-body-small text-secondary transition-colors duration-200 hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-[1_1_200px]">
          <p className="label text-tertiary">Ateliê</p>
          <ul className="mt-3.5 space-y-[9px] text-body-small text-secondary">
            <li>{ATELIER_HOURS}</li>
            <li>{ATELIER_CITY}</li>
            <li>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="transition-colors duration-200 hover:text-primary"
              >
                {INSTAGRAM_HANDLE}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-[clamp(34px,6vh,70px)] flex w-full max-w-[1360px] flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t border-border-subtle pt-[18px] text-[13px] text-tertiary">
        <span>
          © {year} {SITE_NAME}
        </span>
        {/* O frete grátis subiu para a barra de utilidade, no topo: aqui ele
            tinha o mesmo tamanho e a mesma cor do aviso de copyright. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <ThemeToggle />
          {/*
            A entrada do painel fica na faixa de utilidade, junto do tema — e
            não na coluna "Loja", que é a lista do que o cliente veio fazer
            aqui. Não é link de loja; é a porta de serviço.

            `nofollow` e `/admin` no `robots.ts`: o link existe para quem
            administra a loja, não para o índice do Google. Isso não esconde
            nada de quem procura — a rota é adivinhável e a segurança dela
            está no login, não no sigilo do endereço.
          */}
          <Link
            href="/admin"
            rel="nofollow"
            className="nav-link inline-flex min-h-11 items-center gap-1.5 text-body-small text-tertiary transition-colors duration-200 hover:text-primary"
          >
            <Lock size={13} strokeWidth={1.75} aria-hidden />
            Painel
          </Link>
        </div>
      </div>
    </footer>
  );
}
