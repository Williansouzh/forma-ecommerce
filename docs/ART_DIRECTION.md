# FORMA. — Direção de Arte & Motion (v2)

Análise feita sobre a metodologia do projeto **Floralist / Flora & Lis**
(`diprosoft/flora-lis-site/docs/floralist` + `docs/opensourcestack`), que
estuda Medusa, Saleor, Vendure e ERPNext com o formato
**FACT → INFERENCE → RECOMMENDATION** e taxonomia **ADOPT / ADAPT / AVOID /
INVENT**. Aqui, as fontes analisadas são o design system e o frontend do
Flora & Lis (`app/globals.css`, `components/home/*`), aplicados à identidade
própria do FORMA (escandinavo + collectibles japonês + streetwear premium +
galeria).

## Princípio

**RECOMMENDATION:** o site deve se comportar como uma galeria que vende, não
como uma loja que decora. Movimento é exposição: cada animação apresenta o
objeto, nunca chama atenção para si mesma.

## Registro de decisões

| ID | Classe | Decisão |
|---|---|---|
| A-001 | **ADOPT** | Curva de easing única para todo o site (`--ease-forma: cubic-bezier(0.4,0,0.2,1)`) — coerência de movimento como assinatura |
| A-002 | **ADOPT** | Film grain via `feTurbulence` SVG animado em `steps(1)` no compositor — textura de filme 16mm sem custo de CPU perceptível |
| A-003 | **ADOPT** | Slow-zoom infinito (18s alternate) na mídia do hero — presença sem movimento brusco |
| A-004 | **ADOPT** | Scroll progress bar (linha de 2px no topo) — leitura de percurso de exposição |
| A-005 | **ADAPT** | Seções escuras editoriais ("tinta"): F&L usa vinho/dourado; FORMA usa ink `#121212` + laranja queimado — mesmo ritmo claro/escuro, identidade própria |
| A-006 | **ADAPT** | Manifesto (pausa editorial com frase de marca centralizada) adaptado do `manifesto.tsx` do F&L |
| A-007 | **ADAPT** | Marquee de faixa (vocabulário streetwear/drop) entre hero e catálogo |
| A-008 | **ADAPT** | Numeração de seções em exposição (01–05) + hairlines como régua editorial |
| A-009 | **INVENT** | Hero "vitrine de acervo": moldura reta, etiqueta Nº 001, palavra vazada (`text-outline`) no headline, meta row de estúdio no rodapé do hero |
| A-010 | **INVENT** | Ghost numerals em `mix-blend-difference` sobre cards em destaque |
| A-011 | **INVENT** | Preview de imagem das categorias revelada no hover com rotação sutil (galeria que reage ao olhar) |
| A-012 | **AVOID** | Cantos arredondados grandes em fotografia (assinatura de template); raio só em controles clicáveis |
| A-013 | **AVOID** | Animação via listeners de scroll em JS para parallax decorativo; transform/opacity apenas (GPU) |
| A-014 | **AVOID** | Gradientes decorativos genéricos/glassmorphism — luz vem de radial gradients pontuais e do grain |
| A-015 | **ADOPT** | Cortina de transição entre rotas (`template.tsx`): wipe vertical ink com fio accent, conteúdo entra com fade/slide; desativada em `prefers-reduced-motion` |
| A-016 | **ADAPT** | Cursor customizado (dot accent + ring com lag spring e `mix-blend-difference`), só em `pointer: fine`; nativo oculto via classe `.cursor-none-all`; anel expande sobre interativos |
| A-017 | **INVENT** | Botões magnéticos (hero e CTA final) com spring fraco — o botão "busca" o cursor dentro de um raio curto |
| A-018 | **INVENT** | Hero "impressão ao vivo": vaso construído camada por camada numa única timeline (`useMotionValue` + `useTransform`), com gantry subindo, bico extrusor em zigzag sincronizado ao sentido de cada camada, percentual de progresso e loop contínuo; versão estática para `prefers-reduced-motion` |
| A-019 | **AVOID** | Passada de des-AI: removidos `shadow-glow` (11 usos), gradientes radiais decorativos (hero/processo/CTA), ghost numerals, numerais `mix-blend-difference`, watermark do footer, botões magnéticos e cursor customizado (starter-pack Awwwards); Heart do header era móvel de cenário — removido |
| A-020 | **ADOPT** | Sistema de dados em IBM Plex Mono: preços, dimensões, pesos, prazos, percentuais, badges, contagens, IDs de pedido e campos mascarados do checkout. Dados são a linguagem visual do produto (spec sheet) |
| A-021 | **INVENT** | Voz de copy: técnico confiante com número verificável. Manifesto vira processo ("47 camadas, cada uma inspecionada"); hero sub troca sopa de adjetivos por fato ("não existe em estoque / 50 micra / inspecionada à mão") |
| A-022 | **ADAPT** | Grain restrito às seções ink escuras full-bleed (processo + CTA); proibido em painéis claros. Regra de accent: brasa em no máximo 2 elementos por viewport |
| A-023 | **ADOPT** | Paleta material quente: papel `#F2EEE7` (fundo), osso `#E9E4D9` (superfície alternada), tinta `#161310` (preto marrom, inclusive no dark mode — nunca preto puro), texto `#55504A/#8A837A`. Bordas unificadas em `rgba(22,19,16,…)` |
| A-024 | **ADOPT** | Par tipográfico próprio: Archivo Variable (eixo wdth, `font-stretch:120%` nos displays, peso 600) + Instrument Sans (corpo) + IBM Plex Mono (dados). Space Grotesk/Inter aposentados por serem o par default de output genérico |
| A-025 | **INVENT** | Assinatura: print-sweep. Imagens de produto/galeria revelam-se ao entrar na viewport com wipe bottom-up em `steps(26)` + linha de camada ativa; barra de 2px em `steps(14)` imprime a base do card no hover. Gate `html.js` para degradação sem JS |
| A-026 | **ADAPT** | Grade 3×2 de categorias → índice editorial em linhas (numeração mono funcional, contagem tabular, preview da imagem revelando em sweep no hover). Mesmo padrão na página /colecoes |
| A-027 | **INVENT** | Processo vivo: a timeline morre e vira anotação da própria impressora — motor de impressão extraído (`print-engine.tsx`) é reusado na seção escura com as 5 etapas acendendo sincronizadas ao ciclo (janelas de progresso por etapa), leitura de etapa corrente e percentual no rodapé do frame |
| A-028 | **ADOPT** | Referência Arteriors/Cumulus (Awwwards): hero cinematográfico full-bleed — foto real em slow-zoom, scrim tinta, tipografia display sobre a imagem, e o print ao vivo reduzido a um cartão flutuante "AO VIVO · Nº 001" (assinatura preservada sem competir com a foto) |
| A-029 | **ADOPT** | Referência Monolith NYC: grid unboxed — cards perdem borda/fundo/raio; foto pura + legenda, whitespace generoso (gap-y 16). Nicho decoração não usa caixa: caixa é de marketplace |
| A-030 | **ADOPT** | Preview das coleções segue o cursor (spring) sobre o índice, trocando de imagem por linha — extraído para `category-index-list.tsx` e reusado na home e /colecoes |
| A-031 | **INVENT** | Lookbook horizontal "Em casa" (snap-scroll): fotos de ambiente do próprio catálogo com legendas mono cômodo/bairro; todas as fotos do site recebem tratamento tonal único (saturate .92 + multiply brasa 6%) para coesão editorial |

## Critérios de aceitação

- Toda animação roda em `transform`/`opacity` (compositor), exceto grain (composited layer)
- `prefers-reduced-motion: reduce` desativa marquee, slow-zoom, float e parallax (regra global já existente cobre os utilitários novos)
- Contraste mantido nas seções escuras: corpo `white/55+`, captions `white/40` (≥ 4.5:1 no par)
- Nenhuma imagem nova obrigatória: efeitos usam os assets SVG existentes

## Aplicação por superfície

| Superfície | Tratamento |
|---|---|
| Header | transparente → blur no scroll; progress bar fixa |
| Hero | display 124px com palavra vazada; vitrine com slow-zoom + grain + etiqueta; meta row |
| Marquee | faixa ink infinita, pausa em hover/focus |
| Destaques | grid assimétrico 12 cols + ghost numerals |
| Manifesto | hairline + frase display + assinatura tracking 0.3em |
| Coleções | células editoriais com numeral fantasma + preview de imagem no hover |
| Sob medida | cartão muted com steps sequenciais (mantido) |
| Processo | seção ink com grain + glow radial accent + timeline numerada |
| CTA final | ink full-bleed, display 124px vazado, botão invertido |
| Footer | ink com wordmark marca-d'água gigante |

## Próximos passos (não implementados ainda)

- View transitions API nativa quando o Next.js estabilizar o suporte
- Micro-som em interações (add-to-cart, checkout) com toggle explícito

---

# Revisão v3 — consolidação (02 Set 2026)

Consolida três fontes que se contradiziam: este documento, uma *Documentação
Técnica & Diretrizes de Design v2.0* externa (conceito "Monolito Laranja",
Space Grotesk + Inter + JetBrains Mono, terracota sobre `#FAFAF8`) e o estado
real do código. As seções visuais da v2.0 externa (2, 3, 8 e 16) ficam
substituídas pelo que segue; as não-visuais (modelo de dados, contrato de API,
testes, CI/CD, WCAG, Core Web Vitals) seguem valendo como roadmap.

O conceito "Monolito Laranja" foi descartado: laranja sobre off-white neutro é
a paleta default de qualquer gerador. Substituído por **ateliê no fim da
tarde** — luz lateral de janela, bancada de madeira clara, tecido cru.

## Tokens implementados

Valores exatos em `app/globals.css`. Claro / escuro:

| Papel | Token | Claro | Escuro |
|---|---|---|---|
| Fundo (linho) | `--color-background` | `#EFE9DE` | `#1B1A15` |
| Superfície (papel) | `--color-surface` | `#F9F6EF` | `#24221B` |
| Superfície recuada (areia) | `--color-surface-muted` | `#E3DACB` | `#2E2B22` |
| Texto (tinta) | `--color-text-primary` | `#26241E` | `#EDE6D7` |
| Texto secundário (pedra) | `--color-text-secondary` | `#565146` | `#A79E8C` |
| Texto terciário | `--color-text-tertiary` | `#706756` | `#8C8271` |
| Texto quaternário | `--color-text-quaternary` | `#8D8062` | `#72695B` |
| **Acento estrutural (oliva)** | `--color-accent` | `#5C6A49` | `#9EAC7D` |
| **Acento raro (barro)** | `--color-clay` | `#AE5E3D` | `#D68A63` |

Contraste verificado sobre o linho: tinta 12.84:1 · pedra 6.53:1 · terciário
4.62:1 · oliva 4.81:1 — todos acima de 4.5:1. Quaternário (3.22:1) e barro
(3.89:1) só aparecem em texto ≥24px ou placeholder, onde o limiar AA é 3:1.
Os neutros da primeira passada (`#7C7565` / `#A79E8C`) falhavam com 3.79:1 e
2.20:1 — se ajustar a paleta, remeça os quatro degraus.

Par tipográfico: **Fraunces** (display, eixos `SOFT`/`WONK`/`opsz`, peso
300–400) + **Karla** (corpo e etiquetas). Raio: `sm:0 · md:2px · lg:3px ·
xl:4px`. Grão global no `body` a 28% `multiply` (20% `overlay` no escuro).

## Registro de decisões (continuação)

| ID | Classe | Decisão |
|---|---|---|
| A-020 | **SUSPENSA** | Sistema de dados em IBM Plex Mono. A implementação atual removeu os 66 usos de mono e passou preços, dimensões e prazos para Karla com `tabular-nums` — mono lia como spec sheet de equipamento, não como etiqueta de loja. Decisão pendente de avaliação visual; restaurar é mudança pequena e localizada |
| A-023 | **REVISADA** | Paleta material quente mantida em princípio, valores trocados: linho `#EFE9DE` no lugar de papel `#F2EEE7`, e o acento passa de brasa para oliva |
| A-024 | **CONFIRMADA** | Space Grotesk/Inter aposentados — confirmado. Par final é Fraunces + Karla, no lugar de Archivo + Instrument Sans |
| A-032 | **INVENT** | Oliva `#5C6A49` vira a cor estrutural (links, réguas, labels, hover); barro `#AE5E3D` é rebaixado a acento raro, máximo 2 por viewport. Terracota sobre creme é o par default de todo site gerado — a paleta "certa" era justamente o que fazia o site parecer template |
| A-033 | **INVENT** | Disponibilidade em prosa, nunca em semáforo: "Restam 3", "Última peça", "Pronto para enviar", "Feito depois do seu pedido — 5 dias". Dots verde/âmbar/vermelho são convenção de status page. `success`/`warning`/`error` sobrevivem só em validação de formulário e admin, reafinados para dentro da paleta |
| A-034 | **AVOID** | Grid bento proibido na vitrine. O layout modular 7/5·4/4/4·12 é assinatura de landing page de software; editorial é irregular por definição — alturas alternadas (`3/4`, `1/1`, `4/5`, `5/4`) e offsets verticais |
| A-035 | **AVOID** | Nenhum botão flutuante sobre a foto do produto. FAB circular com sombra é UI de aplicativo e tapa o objeto; "Adicionar" aparece no hover, embaixo do preço |
| A-036 | **ADAPT** | Ícones em `strokeWidth={1}` e elenco reduzido (sacola, busca, seta). Toggle sol/lua sai do header — affordance de ferramenta de desenvolvedor — e vira controle em texto no rodapé ("Luz baixa" / "Luz do dia") |

## Armadilhas registradas

- **`revealDelay` é em segundos.** Vai direto para o `delay` do Framer Motion.
  Passar milissegundos (`index * 80`) esconde o card por minutos. Custou um bug
  real; a prop está documentada em `ProductCardProps`.
- **`fetchProducts` precisa de `try/catch`.** Sem ele, a API fora do ar derruba
  a seção inteira em vez de cair no catálogo local — o fallback
  `if (products.length === 0)` nunca chega a rodar.
- **`npm run build` com `next dev` ativo corrompe `.next`.** Sintoma:
  `Cannot find module './vendor-chunks/…'` e 500 em rotas dinâmicas.

## Correções pendentes na Documentação Técnica v2.0

- `src/` não existe — o projeto usa `app/` e `components/` na raiz; `product-card`
  está em `components/product/`, não `components/sections/`
- `@tanstack/react-query`, `react-hook-form`, `zod`, `class-variance-authority` e
  `@hookform/resolvers` não estão instalados; Zustand é 5.0.3, não 4.x
- O backend não é "integração futura": há NestJS + MongoDB em `api/`, com JWT
- Categorias reais: `bonecos`, `decoracao`, `geek`, `miniaturas`, `presentes`,
  `personalizados` — não existem `colecionaveis` nem `arte`
- `--font-body: 'Inter', 'Suisse Int'l'` tem apóstrofo não escapado, o que quebra
  o parse da declaração inteira
- Testes e CI/CD são aspiracionais: não há `.github/workflows`, Jest ou Playwright
