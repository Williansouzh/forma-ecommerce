# FORMA. — E-commerce de Impressão 3D Premium

E-commerce premium da marca **FORMA.** — estúdio de design + loja de colecionáveis + showroom digital. Construído seguindo a documentação de produto (design system, arquitetura, fluxos e roadmap Fase 1/MVP).

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 3.4** com tokens do design system (laranja queimado `#C75B2A`, modo claro/escuro)
- **Framer Motion 11** — animações, stagger reveal e microinterações
- **Zustand 5** — carrinho e UI (persistência em localStorage)

## Funcionalidades (MVP — Fase 1)

- Homepage completa: hero animado, grid assimétrico de destaques, categorias editoriais, processo custom, timeline do estúdio e CTA final
- Catálogo `/colecoes` e `/colecoes/[slug]` com filtros (preço, disponibilidade, tamanho, cor), ordenação e estado vazio
- Página de produto `/produto/[slug]` com galeria + zoom, seletor de cor/quantidade, tabs (descrição, especificações, processo, avaliações) e relacionados
- Carrinho drawer + página dedicada, frete grátis progressivo a partir de R$ 400
- Checkout em 3 steps com validação, máscaras BR (CPF/CEP/telefone/cartão), Pix com 5% off e tela de confirmação
- Busca (`/busca`) + overlay full-screen com atalho tecla `/`
- Personalizados `/personalizados` com formulário e API mock
- SEO: metadata dinâmica, JSON-LD (Product, BreadcrumbList, Organization, WebSite+SearchAction), sitemap e robots
- Acessibilidade WCAG AA: skip link, focus visible, aria labels, `prefers-reduced-motion`

## Comandos

```bash
npm install
npm run dev    # desenvolvimento
npm run build  # produção
npm start      # servir build
```

## Estrutura

```
app/(shop)/          # rotas da loja
app/api/             # products, categories, search, checkout, custom-request
components/          # ui, layout, sections, product, checkout, shared
data/                # seed de produtos e categorias
stores/ hooks/ lib/ types/
public/images/       # SVGs gerados dos produtos/categorias
```
