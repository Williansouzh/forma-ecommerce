# Arquitetura

Duas metades ligadas por um contrato OpenAPI versionado e verificado no CI.

```
loja (Next.js 15)  ──▶  app/api/*  (BFF)  ──▶  api/ (NestJS 11)  ──▶  MongoDB
painel (/admin)    ──▶  lib/admin-api.ts  ──▶
```

`api/openapi/v1.json` é **gerado do código**; `types/generated/api-v1.d.ts` é
derivado dele. Os dois são verificados no CI — mudar um controller ou schema
sem regenerar quebra o build, em vez de virar campo vazio na tela.

---

## Estoque

O estoque é um domínio próprio (`api/src/modules/inventory/`) e o **único**
lugar que escreve saldo. Nenhum outro módulo — nem a Shopee — altera
quantidade por fora.

### Quatro números, não um

| Conceito | Onde vive | O que é |
|---|---|---|
| **Físico** (`onHand`) | `stock_levels` | O que está na prateleira |
| **Reservado** | `stock_levels` | Prometido a um checkout ou pedido não confirmado |
| **Vencido** | soma dos lotes | Físico preso em lote fora da validade |
| **Disponível** | calculado | `máx(0, físico − reservado − vencido)` |
| **Publicável** | calculado | `máx(0, disponível − margem)` — o que vai a um canal externo |

### Coleções

| Coleção | Papel |
|---|---|
| `stock_ledger` | **Imutável.** Toda movimentação, com saldo resultante, lotes consumidos, COGS congelado, canal, ator, motivo e correlation ID. O schema recusa `save` de documento existente e todo `update*`. |
| `stock_batches` | Lotes: quantidade, consumido, perdido, custo unitário, validade. `restante = quantidade − consumido − perdido` é derivado, nunca guardado. |
| `stock_levels` | Contador por SKU (`onHand`, `reserved`, `version`). Existe para que a guarda "não vender o que não tem" caiba em **um** `findOneAndUpdate` condicional. |
| `stock_reservations` | Promessa feita a uma compra. `key` única = idempotência. Transições `held → consumed` e `held → released`. |

### FEFO

*First expired, first out*: vence antes, sai antes; lote **sem** validade sai
**por último**. A ordenação crua erraria justamente isso — ausência compara
como menor que qualquer data, e o lote eterno é o que pode esperar.

O custo do lote congela no COGS da linha de venda. Uma venda que atravessa dois
lotes registra as duas fatias com os dois custos, não uma média.

### Concorrência sem transação

O mongod sobe **standalone, sem replica set** — transação multi-documento não
existe aqui. Em vez disso, toda mudança de saldo é um `findOneAndUpdate` cuja
**condição é a regra**:

```js
{ productId, variantId, $expr: { $gte: [{ $subtract: ["$onHand", "$reserved"] }, qty] } }
```

Duas requisições disputando a última peça: o Mongo aplica uma, a outra volta
sem documento. Índices únicos fazem o resto — `stock_reservations.key`,
`stock_levels.{productId,variantId}`, `shopee_events.key` e o índice **parcial**
em `orders.externalRef`.

O ledger é escrito **depois** do saldo, com o saldo resultante dentro. Falha
entre os dois deixa mudança sem linha, que `auditSku()` detecta. A ordem
inversa deixaria linha sem mudança — invisível.

### `product.stock` é projeção

`product.stock` e `variants[].stock` continuam sendo o que a loja e o painel
leem, mas quem os escreve é só `InventoryService.projectToProduct()`. O ledger
manda. Ajustar estoque agora é `POST /api/v1/inventory/adjust` (motivo
obrigatório) ou `/inventory/receive` — não `PATCH /products/:id`.

Um produto sem `stock` no cadastro é **produção sob demanda**: não tem saldo a
controlar, e a venda não é barrada por falta dele.

---

## Pedidos

| Canal | Código | Origem |
|---|---|---|
| `site` | `C3D-…` | Checkout da loja |
| `shopee` | `SHP-…` | Importado do marketplace |

O ciclo do pedido **dirige** o estoque:

| Transição | Efeito |
|---|---|
| pedido criado | reserva |
| pagamento confirmado (webhook ou painel) | confirma a venda, consome FEFO |
| cancelado, vindo de `pending` | libera a reserva |
| cancelado, vindo de pago ou adiante | devolve ao estoque |
| etapas de produção | nada |

O efeito é decidido pelo estado **anterior**, não só pelo novo: cancelar um
pedido pendente e cancelar um pago não são a mesma coisa.

---

## Fila (outbox)

`outbox_messages` — Mongo, não memória. A venda grava a intenção e termina; a
entrega ao canal externo é do worker. Isso fecha a janela "falha depois da
atualização local e antes da remota" e desacopla o checkout da latência do
marketplace.

`dedupeKey` única, `claim` atômico com lock por tempo, backoff exponencial,
estado `dead` para o que esgota as tentativas (nunca apagado), reprocessamento
manual pelo painel.

---

## Canais de venda

A Shopee é um **canal**, não a dona do estoque. `ShopeeModule` depende de
`InventoryModule` e `OutboxModule`; nenhum dos dois depende dele. Um segundo
marketplace entra sem tocar em lote, ledger ou FEFO.

Detalhes em [`docs/SHOPEE.md`](docs/SHOPEE.md).

---

## Segurança

- Credenciais externas vivem em `integrations.secrets` com `select: false`. O
  painel recebe só uma dica mascarada; o valor real nunca sai da API.
- Webhooks são públicos por necessidade e autenticados por **assinatura**
  (HMAC, comparação em tempo constante). Sem segredo gravado, recusam tudo.
- Payload externo é dado não confiável: DTOs validados, e o que decide estado
  é sempre uma releitura autenticada na API de origem — nunca o corpo da
  notificação.
- Rotas administrativas exigem `superadmin` (`JwtAuthGuard` + `RolesGuard`
  globais; abertura só com `@Public()`).
- Nenhum token completo em log.

---

## Testes

| Suíte | Comando | O que cobre |
|---|---|---|
| Loja | `npm run test:coverage` | Caminho do dinheiro: desconto, frete grátis, centavos |
| API | `cd api && npm test` | Webhooks, estoque, FEFO, concorrência, Shopee |

Os testes de estoque e integração rodam contra **mongod de verdade**, banco
descartável por suíte: as regras se apoiam em comportamento do banco
(`$expr` condicional, índice único), e um repositório falso os deixaria verdes
enquanto quebravam em produção. O único dublê é `ShopeeApiClient`, o limite
externo.

---

## Operação

`docs/RUNBOOK.md` — backup, restauração, ensaio trimestral, contrato OpenAPI.
`docs/SHOPEE.md` — integração, homologação, produção, desativação segura.
