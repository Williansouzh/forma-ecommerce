import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * O invólucro das tabelas densas do painel.
 *
 * As listagens do dia a dia — produtos e pedidos — viram cartão no celular,
 * porque são as telas que a pessoa abre todo dia e não pode depender de
 * arrastar o dedo para ver um preço. As tabelas de conciliação da Shopee são
 * outra coisa: sete colunas de identificador, margem e estado, consultadas de
 * vez em quando, onde virar cartão só empilharia números sem contexto. Aí
 * rolar para o lado é a resposta certa.
 *
 * O que faltava era dizer isso ao leitor. A tabela ficava presa dentro do
 * recuo da seção, cortada no meio do nada, sem nenhum sinal de que havia mais
 * conteúdo fora da tela. Aqui ela sangra até a borda do cartão e ganha o mesmo
 * esmaecido de borda que a faixa de categorias da loja usa para dizer
 * "continua".
 */
export function TableScroller({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "edge-fade-sm no-scrollbar overflow-x-auto",
        "-mx-[18px] px-[18px] sm:-mx-6 sm:px-6 lg:-mx-[30px] lg:px-[30px]",
        className
      )}
    >
      {children}
    </div>
  );
}
