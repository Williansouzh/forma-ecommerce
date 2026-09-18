/*
 * A marca num lugar só.
 *
 * O logotipo é texto, não SVG: já existe Bricolage Grotesque carregada pela
 * página, então desenhar as letras de novo em curva significaria manter duas
 * versões do mesmo nome — e a versão em curva é a que envelhece. Texto também
 * é o que o leitor de tela lê, o que o Ctrl+F acha e o que se ajusta sozinho
 * quando o usuário aumenta a fonte do navegador.
 *
 * O SVG fica para o símbolo, que é geometria pura e não depende de fonte.
 */
import { cn } from "@/lib/utils";

/**
 * Quatro camadas empilhadas, larguras traçando o perfil de um vaso. A de cima
 * é a camada que está saindo do bico agora: é a única com cor, e é a mesma
 * ideia do cartão "AO VIVO · Nº 001" do hero.
 *
 * Raio 0 em todas as barras — é objeto, não interface (regra A-012).
 */
export function Simbolo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("h-[1em] w-[1em] shrink-0", className)}
    >
      <rect x="11" y="5" width="10" height="5" className="fill-accent" />
      <rect x="5" y="11" width="22" height="5" fill="currentColor" />
      <rect x="7" y="17" width="18" height="5" fill="currentColor" />
      <rect x="9" y="23" width="14" height="5" fill="currentColor" />
    </svg>
  );
}

/**
 * O logotipo. O ponto final é parte do nome, não pontuação: é ele que fecha a
 * palavra e é o único ponto de cor da marca em repouso.
 *
 * `comSimbolo` só em superfície onde o nome aparece sozinho, sem contexto —
 * favicon, etiqueta, e-mail. No cabeçalho da loja o símbolo seria redundante.
 */
export function Logotipo({
  className,
  comSimbolo = false,
  classeDoPonto,
}: {
  className?: string;
  comSimbolo?: boolean;
  /**
   * O painel roda sobre ink e tem paleta própria: lá o accent da loja
   * (#C43C08) fica escuro demais. Quem desenha o fundo escolhe o ponto.
   */
  classeDoPonto?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[0.42em] whitespace-nowrap font-display leading-none tracking-[-0.02em]",
        className,
      )}
    >
      {comSimbolo ? <Simbolo className="h-[0.86em] w-[0.86em]" /> : null}
      <span>
        camada<span className={cn("text-accent", classeDoPonto)}>.</span>
      </span>
    </span>
  );
}
