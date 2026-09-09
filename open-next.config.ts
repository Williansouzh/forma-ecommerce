import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Como a loja vira um Worker.
 *
 * O `next build` sozinho produz um servidor Node, e a Cloudflare não roda
 * Node: `wrangler` recusava o deploy com "Missing entry-point to Worker
 * script or to assets directory", porque não havia nada com o formato que ela
 * entende. Este adaptador é a tradução — ele lê a saída do Next e escreve
 * `.open-next/worker.js` mais `.open-next/assets`.
 *
 * SOBRE O PAGES: o caminho do Pages era `@cloudflare/next-on-pages`, que a
 * própria Cloudflare depreciou ("Please use the OpenNext adapter instead") e
 * que trava o Next em `<=15.5.2` — 21 versões atrás da nossa. O projeto na
 * Cloudflare já vinha executando `wrangler versions upload`, que é comando de
 * Workers; a migração de Pages para Workers já tinha acontecido do lado deles.
 *
 * Sem cache incremental configurado por enquanto: as páginas da loja são
 * `force-dynamic` (catálogo e produto leem a API a cada visita) e as do painel
 * não podem ser cacheadas mesmo. Ligar R2 ou KV aqui só faria sentido no dia
 * em que houver ISR de verdade para guardar.
 */
export default defineCloudflareConfig();
