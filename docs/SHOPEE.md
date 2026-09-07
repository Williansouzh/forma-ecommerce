# Integração com a Shopee

A loja é a **fonte oficial do estoque**. A Shopee é um canal de venda: ela
recebe o saldo, não o define. Toda alteração de quantidade — venha do site, do
marketplace ou do painel — passa pelos serviços do domínio de estoque e deixa
uma linha no ledger imutável.

---

## 1. Como o sistema está montado

```
                        ┌──────────────────────────────────────┐
   checkout da loja ───▶│                                      │
                        │        InventoryService              │
   painel (ajuste) ────▶│  ledger · lotes · FEFO · reservas     │◀─── pedido Shopee
                        │  guarda atômica contra saldo negativo │
                        └───────────────┬──────────────────────┘
                                        │ saldo mudou
                                        ▼
                        ┌──────────────────────────────────────┐
                        │   OutboxMessage (Mongo, persistente)  │
                        │   dedupeKey única · backoff · DLQ     │
                        └───────────────┬──────────────────────┘
                                        │ ShopeeSyncService (worker)
                                        ▼
                        ┌──────────────────────────────────────┐
                        │  ShopeeInventoryService               │
                        │  publishableStock() → update_stock    │
                        └───────────────┬──────────────────────┘
                                        ▼
                                 ShopeeApiClient
                          (assina · timeout · traduz erro)
                                        ▼
                              Shopee Open Platform v2
```

Três caminhos trazem informação da Shopee para cá, e nenhum deles é suficiente
sozinho — por isso os três existem:

1. **Push** (`POST /api/v1/shopee/webhook`) — rápido, mas pode se perder.
2. **Varredura** (`get_order_list` a cada 10 min) — a rede embaixo do push.
3. **Conciliação** (a cada 6 h, ou sob demanda) — compara saldo a saldo e
   corrige o que os dois primeiros deixaram passar.

### Arquivos

| Papel | Arquivo |
|---|---|
| Domínio de estoque | `api/src/modules/inventory/inventory.service.ts` |
| FEFO (puro) | `api/src/modules/inventory/fefo.ts` |
| Estoque publicável (puro) | `api/src/modules/inventory/publishable-stock.ts` |
| Fila persistente | `api/src/modules/outbox/outbox.service.ts` |
| Cliente HTTP da Shopee | `api/src/modules/shopee/shopee-api.client.ts` |
| Assinatura (entrada e saída) | `api/src/modules/shopee/shopee-signature.ts` |
| Tokens e renovação | `api/src/modules/shopee/shopee-auth.service.ts` |
| Associação produto↔anúncio | `api/src/modules/shopee/shopee-link.service.ts` |
| Envio de saldo | `api/src/modules/shopee/shopee-inventory.service.ts` |
| Importação de pedidos | `api/src/modules/shopee/shopee-order.service.ts` |
| Mapa de status | `api/src/modules/shopee/shopee-status.map.ts` |
| Conciliação | `api/src/modules/shopee/shopee-reconciliation.service.ts` |
| Worker e cronograma | `api/src/modules/shopee/shopee-sync.service.ts` |
| Webhook | `api/src/modules/shopee/shopee-webhook.controller.ts` |
| Painel | `app/admin/shopee/page.tsx` |

---

## 2. Decisões técnicas

### O estoque publicável é uma função só

```ts
estoquePublicável = máximo(0, disponível − margemDeSegurança)
disponível        = máximo(0, físico − reservado − vencido)
```

Vive em `publishable-stock.ts`, sem dependência de Nest, Mongo ou Shopee.
Qualquer canal futuro usa a mesma função — e o teste da margem não precisa de
banco.

A margem existe porque o canal externo demora a saber: entre a venda no site e
o `update_stock` chegar na Shopee há uma janela em que os dois lados acham que
têm a peça. Segurar N unidades encolhe essa janela para o comprador em vez de
para o vendedor.

### A baixa acontece em `READY_TO_SHIP`

Não em `COMPLETED`. `READY_TO_SHIP` é o primeiro estado em que a Shopee garante
o pagamento e libera o envio; daí em diante a peça é do comprador. Esperar
`COMPLETED` — que só chega depois de vencido o prazo de devolução, semanas
depois — deixaria o estoque anunciando peça que já saiu da prateleira.

### Sem transação, e de propósito

O `docker-compose.yml` sobe o mongod **standalone, sem replica set**, então
transação multi-documento não existe neste ambiente. O desenho não depende de
uma: toda mudança de saldo é um `findOneAndUpdate` **condicional**, onde a
condição é a própria regra ("tem o bastante disponível"). Duas requisições
disputando a última peça não precisam de lock — o Mongo aplica uma e a outra
volta sem documento.

O ledger recebe a linha **depois** de o saldo mudar, com o saldo resultante
dentro. Se o processo morrer entre as duas, sobra uma mudança sem linha, que a
conciliação enxerga porque a soma do ledger deixa de bater com o contador
(`auditSku`). A ordem inversa produziria uma linha sem mudança — invisível.

### Três travas contra baixa dupla

Cada uma cobre uma falha diferente:

1. `ShopeeEvent.key` única (`SHOPEE:shopId:orderSn:eventType`) — o mesmo evento
   não roda duas vezes.
2. `externalRef` única no pedido — o mesmo `order_sn` não vira dois pedidos.
3. A transição da reserva `held → consumed` — mesmo que 1 e 2 falhem, o estoque
   baixa uma vez.

A terceira é a que realmente segura: as duas primeiras dependem de o evento
chegar do jeito esperado; a terceira não depende de nada externo.

### `product.stock` virou projeção

Os campos `product.stock` e `variants[].stock` **continuam existindo** e
continuam sendo o que a vitrine, o catálogo e o painel leem. O que mudou é
quem os escreve: agora só `InventoryService.projectToProduct()`. O ledger
manda. Foi a alternativa a trocar o contrato da API e reescrever a loja inteira
por causa de uma integração de marketplace.

**Consequência operacional:** editar `stock` pelo `PATCH /products/:id` grava
um número que a próxima movimentação sobrescreve. Ajuste de estoque agora se
faz por `POST /api/v1/inventory/adjust` (com motivo obrigatório) ou
`/inventory/receive`.

### A fila é do sistema, não da Shopee

`OutboxModule` não conhece marketplace nenhum. `ShopeeModule` depende de
`InventoryModule` e `OutboxModule`; nenhum dos dois depende dele. É essa
direção que permite ligar um segundo canal sem tocar em lote, ledger ou FEFO.

---

## 3. Cadastrar o aplicativo na Shopee Open Platform

> **Só quer ligar a loja?** O passo a passo operacional, com o que clicar e o
> que costuma dar errado em cada etapa, está em
> [`CONECTAR_SHOPEE.md`](CONECTAR_SHOPEE.md). A referência das rotas —
> parâmetros, limites e o que ainda não usamos — está em
> [`SHOPEE_API.md`](SHOPEE_API.md). Esta seção é a referência resumida.

1. Crie a conta de parceiro em <https://open.shopee.com> e registre um app.
2. Anote **Partner ID** (público) e **Partner Key** (privada — trate como senha).
3. Cadastre a **Redirect URL** da autorização:
   `https://SEU-DOMINIO/admin/shopee`
4. Cadastre a **Push URL** (webhook):
   `https://SEU-DOMINIO-DA-API/api/v1/shopee/webhook`
5. Habilite os pushes de pedido (`Order Status Update`).
6. Peça as permissões (*scopes*) de: leitura de produto, atualização de estoque
   e leitura de pedido.

### Hosts usados

| Ambiente | API | Autorização |
|---|---|---|
| Brasil (produção) | `https://openplatform.shopee.com.br/api/v2` | `https://open.shopee.com.br` |
| Global (produção) | `https://partner.shopeemobile.com/api/v2` | `https://open.shopee.com` |
| Sandbox | `https://openplatform.sandbox.test-stable.shopee.sg/api/v2` | `https://open.sandbox.test-stable.shopee.com` |

A região é escolhida no painel (Integrações → Shopee → Região).

### Endpoints usados

| Uso | Endpoint |
|---|---|
| Trocar `code` por tokens | `POST /api/v2/auth/token/get` |
| Renovar token | `POST /api/v2/auth/access_token/get` |
| Listar anúncios | `GET /api/v2/product/get_item_list` |
| Detalhe do anúncio | `GET /api/v2/product/get_item_base_info` |
| Variações e estoque | `GET /api/v2/product/get_model_list` |
| **Atualizar estoque** | `POST /api/v2/product/update_stock` |
| Listar pedidos | `GET /api/v2/order/get_order_list` |
| Detalhe do pedido | `GET /api/v2/order/get_order_detail` |

### Assinatura de saída

```
sign = HMAC-SHA256(partner_key, partner_id + path + timestamp [+ access_token + shop_id])
```

Hex, no query param `sign`. O `path` é o **caminho completo**
(`/api/v2/product/update_stock`) — assinar o caminho curto produz um `sign` que
a Shopee recusa com `error_sign` e nenhuma outra explicação.

---

## 4. Autorizar a loja

1. Painel → **Integrações** → grave **Partner ID**, **Partner Key** e a região.
   Ligue a integração.
2. Painel → **Shopee** → *Abrir autorização da Shopee*. Uma aba abre no portal.
3. O lojista autoriza; a Shopee redireciona para
   `/admin/shopee?code=…&shop_id=…`.
4. Cole `code` e `shop_id` nos campos e clique em **Conectar**.

O `code` vale **uma vez só e por poucos minutos**. Se a troca falhar, refaça a
autorização — repetir com o mesmo código não funciona.

O access token vale 4 horas. A renovação é automática, com 10 minutos de folga,
e renovações simultâneas compartilham uma única chamada (a Shopee invalida o
refresh token usado; cinco renovações em paralelo derrubariam a conexão).

---

## 5. Webhook

`POST /api/v1/shopee/webhook` — público, autenticado pela assinatura.

**Ponto em aberto, e é preciso confirmar antes de produção.** A documentação
oficial não estava acessível de onde esta integração foi escrita
(`open.shopee.com` bloqueia acesso automatizado), e as implementações públicas
divergem sobre o formato da assinatura do push. Os dois esquemas estão
implementados e testados; escolha o correto no painel (Shopee → Conexão →
*Assinatura do webhook*):

| Esquema | Header | Base assinada |
|---|---|---|
| `authorization` (padrão) | `Authorization` | `url + "|" + corpo cru` |
| `x-shopee-signature` | `x-shopee-signature` | `corpo cru` |

Como confirmar: envie um push de teste pelo console da Shopee e veja o log da
API. Assinatura recusada aparece como `push com assinatura inválida recusado`.
Se aparecer, troque o esquema e repita.

**O desenho não depende de acertar isso de primeira.** O corpo do push nunca
decide estoque: o handler enfileira e o worker **relê o pedido** em
`get_order_detail`, autenticado. Um código de push fora da lista tratada é
registrado e ignorado, e a varredura periódica importa o pedido minutos
depois. O custo de errar é **latência**, não estoque errado.

> O mapeamento dos códigos de push **foi confirmado** desde então, na
> especificação de `v2.push.set_app_push_config`: `3 = Order status update`,
> que é o que `ORDER_PUSH_CODES` já tratava. A tabela completa está em
> [`SHOPEE_API.md`](SHOPEE_API.md#códigos-de-push). Continua em aberto apenas
> o **formato da assinatura**.

Requisitos de infraestrutura:

- `PUBLIC_API_URL` precisa bater exatamente com a URL cadastrada no console —
  ela entra na base da assinatura do esquema `authorization`. Atrás de proxy,
  o header `Host` chega reescrito; por isso usamos a URL configurada, não a do
  request.
- O corpo é lido **cru** (`rawBody`). Re-serializar o objeto parseado reordena
  chaves e o HMAC deixa de bater sem nada no log explicando por quê.

---

## 6. Associação de produtos

A ligação é por `item_id` / `model_id`, **nunca por nome**. Um produto com
variações tem uma associação **por variação** (`model_id` próprio, saldo
próprio, margem própria).

O painel propõe associações comparando SKU (`GET /shopee/suggestions`). A
proposta é só proposta:

- **SKU exato** — um SKU interno para um anúncio: pode confirmar direto.
- **Ambíguo** — dois ou mais candidatos com o mesmo SKU: exige escolha humana,
  porque associar errado anuncia o estoque de outra peça.

O SKU interno usado na comparação é o `slug` do produto (ou `slug/variacao`),
que já é único no banco.

Estados da associação:

| Estado | Sincroniza? | Quando |
|---|---|---|
| `active` | sim | confirmada |
| `pending` | **não** | proposta ainda não confirmada |
| `disabled` | não | desligada de propósito |
| `error` | sim (continua tentando) | última sincronização falhou |

---

## 7. Mapeamento de status

| Status Shopee | Interno | Efeito no estoque |
|---|---|---|
| `UNPAID` | `pending` | **reserva** |
| `INVOICE_PENDING` | `pending` | reserva |
| `READY_TO_SHIP` | `paid` | **confirma a venda (FEFO)** |
| `RETRY_SHIP` | `paid` | confirma |
| `PROCESSED` | `processing` | nada |
| `SHIPPED` | `shipped` | nada |
| `TO_CONFIRM_RECEIVE` | `shipped` | nada |
| `COMPLETED` | `delivered` | nada |
| `IN_CANCEL` | `paid` | **nada** |
| `CANCELLED` | `cancelled` | libera reserva **ou** devolve ao estoque |
| `TO_RETURN` | `cancelled` | devolve ao estoque |

`IN_CANCEL` é cancelamento **pedido**, não aceito. Soltar o estoque aqui o
devolveria à venda enquanto o pedido ainda pode seguir — e aí duas pessoas
teriam comprado a mesma peça.

`CANCELLED` cobre os dois momentos: tenta soltar a reserva; se ela já virou
venda, devolve a peça ao estoque. Uma das duas operações não faz nada, e juntas
cobrem o antes e o depois da baixa sem precisar adivinhar em qual estamos.

**Pedido descoberto já adiantado.** Se a primeira vez que vemos um pedido ele
já está em `PROCESSED`/`SHIPPED`/`COMPLETED` (o push de `READY_TO_SHIP` se
perdeu), a baixa acontece **naquele momento** — ver `effectOnFirstSight`. Sem
isso o saldo ficaria inflado para sempre, e a conciliação propagaria o número
errado para a Shopee em vez de corrigi-lo.

**Eventos fora de ordem.** A Shopee não garante ordem de entrega. Um push de
`READY_TO_SHIP` chegando depois de `SHIPPED` é descartado (`isStaleTransition`).
Cancelamento e devolução ficam fora dessa régua: são legítimos a qualquer
momento.

---

## 8. Conciliação

Roda a cada 6 h e sob demanda no painel. Para cada associação ativa:

1. Calcula o saldo publicável central.
2. Lê o saldo atual na Shopee.
3. Registra a diferença **antes** de corrigir.
4. Corrige a Shopee com o saldo central.

A direção é sempre a mesma — o sistema manda, a Shopee obedece — porque só um
dos dois lados conhece o ledger, os lotes e as reservas do site.

O botão **Conferir divergências (simulação)** (`dryRun`) mostra o que mudaria
sem escrever nada. Nenhuma correção é silenciosa: cada uma vira linha no
relatório e log com correlation ID.

---

## 9. Retentativas e fila de erros

| Parâmetro | Valor |
|---|---|
| Timeout por chamada | 15 s (`AbortSignal.timeout`) |
| Tentativas | 5 |
| Espera | 2 s → 8 s → 32 s → 2 min → 8 min (teto 15 min) |
| Lock do worker | 60 s (renovável; expira se o processo morre) |
| Lote por ciclo | 10 mensagens |
| Ciclo | 5 s |

Erro de limite de taxa (`error_rate_limit` / HTTP 429) **interrompe a volta
inteira**, não só a mensagem: o limite é da loja, e insistir nas outras só
prolongaria o bloqueio.

Mensagem que esgota as tentativas vira `dead` e **fica lá**, com o erro. O
painel (Shopee → Fila e erros) reprocessa uma ou todas. Uma falha da Shopee
nunca desfaz uma venda local já confirmada.

Sucesso parcial (`failure_list` preenchida em HTTP 200) é tratado como falha —
senão marcaríamos como sincronizado um anúncio que a Shopee recusou, que é a
divergência mais difícil de achar depois porque tudo parece verde.

---

## 10. Auditoria

Cada linha do ledger (`stock_ledger`, imutável — o schema recusa `save` de
documento existente e `updateOne`/`findOneAndUpdate`) registra:

`type` · `quantity` (sinalizada) · `channel` (`SITE`/`SHOPEE`/`ADMIN`/`SYSTEM`)
· `onHandAfter` · `reservedAfter` · `batches[]` com custo unitário congelado ·
`cogs` · `orderCode` · `externalOrderSn` · `reservationKey` · `actor` ·
`reason` · `correlationId` · `createdAt`.

Movimentação causada pela Shopee usa `channel: "SHOPEE"` e carrega o `order_sn`.

`ShopeeEvent` guarda todo evento recebido, **inclusive os ignorados**, com o
motivo — sem isso, "por que este pedido não entrou?" não teria resposta.

Nenhum token completo vai para log. O client registra código de erro, mensagem
e correlation ID; nunca o corpo da resposta.

---

## 11. Executar localmente

```bash
docker compose up -d mongo          # Mongo em 127.0.0.1:27018
cd api && npm install && npm run start:dev
cd .. && npm install && npm run dev
```

Sem loja conectada, tudo funciona: o `enqueueSync` sai cedo, a varredura não
roda, e o checkout segue normalmente.

Para desligar o worker neste processo (ao rodar várias réplicas da API, por
exemplo):

```bash
SHOPEE_WORKER=off npm run start:dev
```

### Testes

```bash
docker compose up -d mongo
cd api && npm test                  # 145 casos
cd api && npm run test:coverage     # cobertura das funções de decisão
cd .. && npm run test:coverage      # caminho do dinheiro na loja
```

Os testes de estoque e Shopee rodam contra **mongod de verdade** (banco
descartável por suíte). É de propósito: as regras se apoiam em
`findOneAndUpdate` condicional, `$expr` e índice único, que são comportamento
do banco. Um repositório falso deixaria os testes de concorrência verdes e
quebraria em produção. O único dublê é `ShopeeApiClient`.

Aponte para outro Mongo com `MONGODB_TEST_URI`.

---

## 12. Resolução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `error_sign` em toda chamada | `partner_key` errada, ou relógio do servidor fora de hora | Confira a chave em Integrações; sincronize o relógio (NTP) |
| Push sempre recusado | Esquema de assinatura errado, ou `PUBLIC_API_URL` diferente da cadastrada | Troque o esquema no painel; confira a URL no console |
| `invalid_access_token` repetido | Refresh token inválido | Reautorize a loja |
| Estoque não chega na Shopee | Associação `pending` ou `disabled`; worker desligado | Confirme a associação; confira `SHOPEE_WORKER` |
| Pedido não importado | Anúncio sem associação, ou push de código não mapeado | Veja Shopee → Pedidos → Eventos; use *Buscar pedidos agora* |
| Divergência persistente | Mensagens na fila de mortas | Shopee → Fila e erros → *Reprocessar* |
| `auditSku().ok === false` | Processo morreu entre o saldo e o ledger | Investigue o SKU pelo ledger; corrija com `/inventory/adjust` e motivo |

---

## 13. Desativar a integração com segurança

Em ordem, do menos ao mais drástico:

1. **Pausar a sincronização** — Shopee → Conexão → desligar *Sincronização
   automática*. Pedidos continuam sendo importados; o saldo para de ser
   enviado. Reversível na hora.
2. **Desligar a integração** — Integrações → Shopee → *Desligar*. Nada mais é
   enviado nem importado; a fila para. Tokens e associações permanecem.
3. **Desconectar a loja** — Shopee → Conexão → *Desconectar*. Apaga access e
   refresh token do cofre. **As associações são preservadas** — reconectar não
   custa reassociar tudo.
4. **Parar só este processo** — `SHOPEE_WORKER=off`. Útil quando várias
   réplicas da API rodam e só uma deve sincronizar.

Nada disso apaga ledger, lotes ou pedidos importados. Não há passo destrutivo,
e é de propósito: desligar uma integração sob pressão não pode custar dados.

---

## 14. Checklist de homologação (sandbox)

- [ ] App criado no sandbox; `partner_id`/`partner_key` gravados; região `SANDBOX`
- [ ] Loja de teste autorizada; painel mostra "Conectada" e a validade do token
- [ ] Push de teste aceito (log **sem** "assinatura inválida") — esquema confirmado
- [ ] Anúncios listados; associação por SKU proposta e confirmada
- [ ] Produto com variação: uma associação por `model_id`
- [ ] Venda no site → saldo correto chega no anúncio (com a margem descontada)
- [ ] Pedido criado no sandbox → aparece em Shopee → Pedidos com código `SHP-`
- [ ] `READY_TO_SHIP` → ledger com linha `sale`, canal `SHOPEE`, COGS do lote
- [ ] Cancelamento antes e depois da baixa → saldo volta ao valor certo
- [ ] Conciliação em simulação lista divergência; sem simulação, corrige
- [ ] Token forçado a vencer → renovação automática, sem erro visível
- [ ] Mensagem na fila de mortas → reprocessamento pelo painel funciona

## 15. Checklist de produção

- [ ] `PUBLIC_API_URL` = URL pública real, idêntica à cadastrada no console
- [ ] HTTPS válido no endpoint do webhook
- [ ] Região `BR` selecionada
- [ ] Esquema de assinatura do push **confirmado em homologação**
- [ ] `ORDER_PUSH_CODES` conferido contra a documentação do console
- [ ] Margem de segurança definida por peça (as de giro rápido merecem mais)
- [ ] Backup do Mongo rodando (`docs/RUNBOOK.md`) — o ledger e os tokens vivem lá
- [ ] Uma única réplica com worker ativo, ou aceite explícito de várias
      (o lock por tempo já protege, mas multiplica o consumo do limite de taxa)
- [ ] Primeira conciliação executada em **simulação** e revisada antes de valer
- [ ] Equipe sabe que `PATCH /products` não é mais o caminho de ajustar estoque
- [ ] Alerta em cima de "última sincronização saudável" e do tamanho da fila de mortas
