/**
 * As classes de rótulo e campo do painel, num lugar só.
 *
 * Estas duas strings estavam copiadas caractere por caractere em quatro
 * arquivos — `shopee`, `integracoes`, `configuracoes` e a gaveta de produto.
 * É a mesma história do botão de envio de imagem: quando o campo precisou
 * mudar, uma das cópias ficou para trás e o defeito só apareceu no uso.
 *
 * O 16px do campo é piso técnico, não escolha tipográfica: abaixo disso o
 * Safari do iPhone amplia a página ao focar o campo e NÃO desfaz o zoom ao
 * sair dele. Num painel que é todo formulário, o primeiro toque deixava a
 * tela inteira ampliada e com rolagem horizontal até recarregar. Se for
 * mexer aqui, esse é o número que não pode cair.
 */
export const labelClass =
  "block text-[12px] font-semibold uppercase tracking-[0.12em] text-tertiary";

export const fieldClass =
  "mt-1.5 min-h-[42px] w-full rounded-md border border-strong bg-surface px-3 text-[16px] font-normal normal-case tracking-normal outline-none transition-colors focus:border-accent";
