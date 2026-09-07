# API da Shopee — rotas que usamos e que vamos usar

Referência das rotas da Shopee Open Platform v2 relevantes para esta loja: o
que cada uma faz, o que ela exige, e o que já está implementado aqui.

Para ligar a loja, veja [`CONECTAR_SHOPEE.md`](CONECTAR_SHOPEE.md). Para as
decisões de arquitetura, [`SHOPEE.md`](SHOPEE.md).

---

## Sobre as informações deste documento

`open.shopee.com` bloqueia acesso automatizado, então este documento **não**
foi montado a partir do portal. Ele vem dos **arquivos de especificação da
própria Shopee** (`api_id`, `api_name`, `params.request_params`,
`params.response_params`, `path`, `method`), cruzados com o nosso código.

O que isso significa na prática:

- **Caminhos, métodos, nomes e obrigatoriedade dos campos são confiáveis** —
  saem da spec, não de memória.
- **Limites de taxa não estão aqui.** O campo `rate_limit` vem zerado no dump
  que temos; os números reais estão no console do seu app.
- Campos podem ter sido acrescentados depois. Na dúvida, o console manda.

`method` na spec é numérico: `1` = POST, `2` = GET. Confirmado por cruzamento
com um cliente de referência (`update_stock` = 1 = POST, `get_order_list` =
2 = GET).

---

## Fundamentos

### Hosts

| Ambiente | Base da API |
|---|---|
| Brasil (produção) | `https://openplatform.shopee.com.br/api/v2` |
| Global (produção) | `https://partner.shopeemobile.com/api/v2` |
| Sandbox | `https://openplatform.sandbox.test-stable.shopee.sg/api/v2` |

Configurável no painel em **Integrações → Shopee → Região**.

### Dois tipos de rota

A spec classifica cada endpoint em `api_type`, e isso muda **o que entra na
assinatura**:

| Tipo | Parâmetros comuns | Base assinada |
|---|---|---|
| **Public** | `partner_id`, `timestamp`, `sign` | `partner_id + path + timestamp` |
| **Shop** | + `access_token`, `shop_id` | `+ access_token + shop_id` |

`sign` é HMAC-SHA256 em hex com a `partner_key`, no query param. O `path` é o
**caminho completo** (`/api/v2/product/update_stock`) — assinar o curto
devolve `error_sign` sem outra explicação.

O `timestamp` **expira em 5 minutos**: relógio do servidor fora de hora derruba
tudo.

Implementado em `api/src/modules/shopee/shopee-signature.ts`. Os testes cobrem
a base concatenada (público vs. loja), a diferença entre caminho curto e
completo, e a recusa de assinatura inválida.

### Envelope de resposta

Toda rota responde `{ error, message, request_id, response }`. **A v2 devolve
HTTP 200 mesmo em erro de negócio** — quem manda é o campo `error`, não o
status. Guarde o `request_id`: é o que o suporte da Shopee pede.

---

## Autenticação

### `POST /auth/token/get` — trocar o código pelos tokens
`v2.public.get_access_token` · Public

| Campo | Tipo | |
|---|---|---|
| `code` | string | **obrigatório** — vale **uma vez** e expira em **10 minutos** |
| `partner_id` | int64 | **obrigatório** |
| `shop_id` | int64 | opcional (loja) |
| `main_account_id` | int64 | opcional (conta principal) |

Devolve `access_token`, `refresh_token`, `expire_in` e as listas de ids
autorizados (`shop_id_list`, `merchant_id_list`, …).

> Falhou? Refaça a autorização. Repetir com o mesmo `code` **nunca** funciona.

**Usamos:** `shopee-auth.service.ts` → `exchangeCode()`

### `POST /auth/access_token/get` — renovar
`v2.public.refresh_access_token` · Public

| Campo | Tipo | |
|---|---|---|
| `refresh_token` | string | **obrigatório** |
| `partner_id` | int64 | **obrigatório** |
| `shop_id` | int64 | opcional — um entre shop/merchant/supplier/user |

> **O `refresh_token` vale 30 dias e é de USO ÚNICO.** Cada renovação devolve
> um novo, e o anterior morre. Duas renovações simultâneas com o mesmo token
> derrubam a conexão — a segunda recebe um token já queimado.
>
> É por isso que `ShopeeAuthService` compartilha uma única promessa de
> renovação entre chamadas concorrentes (`refreshInFlight`). Não é
> micro-otimização: sem isso, cinco jobs percebendo o token vencido ao mesmo
> tempo desconectariam a loja.

O `access_token` dura **4 horas**. Renovamos com 10 minutos de folga.

**Usamos:** `shopee-auth.service.ts` → `refresh()`

### `GET /shop/auth_partner` — página de autorização
Não é chamada por nós: é a URL para onde o lojista é **enviado**. Montada
assinada em `shopee-api.client.ts` → `buildAuthorizationUrl()`.

---

## Produtos e estoque

### `POST /product/update_stock` — **a rota central da integração**
`v2.product.update_stock` · Shop

| Campo | Tipo | |
|---|---|---|
| `item_id` | int64 | **obrigatório** — um item por chamada |
| `stock_list` | object[] | **obrigatório** — 1 a 50 entradas |

Cada entrada: `{ model_id, seller_stock: [{ location_id?, stock }] }`.
`model_id: 0` para item sem variação.

Pontos que custam caro se passarem batidos:

- **Um `item_id` por chamada.** Vários `model_id` do mesmo item cabem juntos;
  itens diferentes exigem chamadas separadas.
- **Atualiza apenas `seller_stock`.**
- **Sucesso parcial existe:** HTTP 200 com `failure_list` preenchida. Tratar
  isso como sucesso marcaria como sincronizado um anúncio recusado — a
  divergência mais difícil de achar, porque tudo parece verde. Nosso código
  trata `failure_list` como falha.
- Com promoção ativa, o estoque total precisa ser ≥ `reserved_stock` da
  promoção.
- Item deletado não aceita alteração de estoque.

**Usamos:** `shopee-inventory.service.ts` → `pushStock()`

### `GET /product/get_item_list` — listar anúncios
`v2.product.get_item_list` · Shop

| Campo | Tipo | |
|---|---|---|
| `offset` | int64 | **obrigatório** |
| `page_size` | int64 | **obrigatório** — máx. 100 |
| `item_status` | string[] | **obrigatório** — `NORMAL`/`BANNED`/`UNLIST`/`REVIEWING`/`SELLER_DELETE`/`SHOPEE_DELETE` |
| `update_time_from` / `update_time_to` | timestamp | opcional |

> **Limitação nossa:** lemos só a primeira página (100 anúncios). Loja maior
> vai precisar de paginação por `offset`.

**Usamos:** `shopee-inventory.service.ts` → `listRemoteListings()`

### `GET /product/get_item_base_info` — detalhe do anúncio
`v2.product.get_item_base_info` · Shop

| Campo | Tipo | |
|---|---|---|
| `item_id_list` | int64[] | **obrigatório** — **limite de 50** |

Traz `item_name`, `item_sku`, `has_model` e `stock_info_v2`. É de onde sai o
saldo remoto de item sem variação, na conciliação.

**Usamos:** `listRemoteListings()` e `fetchRemoteStock()`

### `GET /product/get_model_list` — variações
`v2.product.get_model_list` · Shop

| Campo | Tipo | |
|---|---|---|
| `item_id` | int64 | **obrigatório** — um por chamada |

Traz `model_id`, `model_sku` e `stock_info_v2` de cada variação. É a rota que
permite associar **uma variação por `model_id`**.

**Usamos:** `listRemoteListings()` e `fetchRemoteStock()`

### `POST /product/update_price` — preço
`v2.product.update_price` · Shop · `item_id` + `price_list` (1 a 50)

**Não usamos.** O preço da Shopee é gerido lá, de propósito: margem de
marketplace não é a mesma da loja. Se um dia for, é aqui.

### `GET /product/get_item_promotion` — promoções ativas
`v2.product.get_item_promotion` · Shop · `item_id_list` (1 a 50)

**Não usamos, mas provavelmente vamos.** É como se descobre o
`reserved_stock` de promoção — o piso abaixo do qual o `update_stock` é
recusado. Hoje, um anúncio em campanha pode fazer a sincronização falhar com
um erro que não explica o motivo.

---

## Pedidos

### `GET /order/get_order_list` — varredura
`v2.order.get_order_list` · Shop

| Campo | Tipo | |
|---|---|---|
| `time_range_field` | string | **obrigatório** — `create_time` ou `update_time` |
| `time_from` / `time_to` | timestamp | **obrigatório** — janela máxima de **15 dias** |
| `page_size` | int32 | **obrigatório** — 1 a 100 |
| `cursor` | string | opcional — paginação |
| `order_status` | string | opcional — **um por requisição** |
| `response_optional_fields` | string | opcional — `order_status` |
| `logistics_channel_id` | int32 | opcional — **só vale para BR** |

Usamos `update_time`, não `create_time`: queremos pedidos que **mudaram**, não
só os novos.

**Usamos:** `shopee-order.service.ts` → `pollRecentOrders()`, a cada 10 min

### `GET /order/get_order_detail` — a fonte da verdade
`v2.order.get_order_detail` · Shop

| Campo | Tipo | |
|---|---|---|
| `order_sn_list` | string | **obrigatório** — separados por vírgula, **limite 50** |
| `response_optional_fields` | string | opcional — peça o que precisa |

> **Nada decide estoque sem passar por aqui.** O corpo do push diz apenas
> "olhe o pedido tal"; o que aconteceu vem desta chamada autenticada. É a
> mesma postura do webhook do Mercado Pago neste projeto.

Pedimos `item_list,recipient_address,total_amount,buyer_username`.

**Usamos:** `shopee-order.service.ts` → `fetchOrderDetail()`

### Status possíveis

`UNPAID` · `READY_TO_SHIP` · `PROCESSED` · `RETRY_SHIP` · `SHIPPED` ·
`TO_CONFIRM_RECEIVE` · `IN_CANCEL` · `CANCELLED` · `TO_RETURN` · `COMPLETED` ·
`INVOICE_PENDING`

O mapeamento para estoque está em `shopee-status.map.ts` e explicado em
[`SHOPEE.md`](SHOPEE.md#7-mapeamento-de-status).

### `POST /order/handle_buyer_cancellation` — aceitar ou recusar cancelamento
`v2.order.handle_buyer_cancellation` · Shop

| Campo | | |
|---|---|---|
| `order_sn` | string | **obrigatório** |
| `operation` | string | **obrigatório** — `ACCEPT` ou `REJECT` |

**Não usamos.** É o que resolve um pedido em `IN_CANCEL`. Hoje o cancelamento
é decidido no painel da Shopee; trazer isso para cá é um passo natural.

### `POST /order/cancel_order` — cancelar como vendedor
`v2.order.cancel_order` · Shop · `order_sn` + `cancel_reason`
(`OUT_OF_STOCK`, `CUSTOMER_REQUEST`, …). `item_list` obrigatório quando o
motivo é `OUT_OF_STOCK`.

**Não usamos, e é uma decisão.** Cancelar por falta de estoque afeta a
reputação da loja na Shopee. Com o estoque central funcionando, a venda do
item inexistente não deveria acontecer — se acontecer, é sinal de divergência,
e o certo é investigar, não automatizar o cancelamento.

---

## Push (webhook)

### Códigos de push

Da spec de `v2.push.set_app_push_config`:

| Código | Evento | Tratamos? |
|---|---|---|
| 1 | Shop authorization for partners | não |
| **3** | **Order status update push** | **sim** |
| 2 | Shop deauthorization for partners | **não — vale implementar** |
| 4 | TrackingNo push | não |
| 5 | Shopee Updates | não |
| 6 | Banned item push | não |
| 7 | Item promotion push | não |
| 8 | Reserved stock change push | não |
| 9 | Promotion update push | não |
| 10 | Webchat push | não |
| 11 | Video upload push | não |
| 12 | OpenAPI authorization expiry push | **não — vale implementar** |
| 13 | Brand register result | não |

> **Confirmação:** o `ORDER_PUSH_CODES = new Set([3])` de
> `shopee-webhook.controller.ts` está correto. Essa era uma das incertezas em
> aberto da integração, e a spec a resolve.

Dois candidatos claros para depois:

- **código 2** (desautorização): hoje, se o lojista revogar o acesso pelo
  painel da Shopee, descobrimos só quando uma chamada falha. Tratar o push
  marcaria a conexão como perdida na hora.
- **código 12** (expiração da autorização): avisaria antes de quebrar.

### `POST /push/set_app_push_config` — configurar o callback
`v2.push.set_app_push_config` · **Public**

| Campo | Tipo | |
|---|---|---|
| `callback_url` | string | opcional — o endereço que recebe os pushes |
| `set_push_config_on` | int[] | opcional — códigos a **ligar** |
| `set_push_config_off` | int[] | opcional — códigos a **desligar** |
| `blocked_shop_id_list` | int[] | opcional — até 500 |

**Não usamos** (configuramos pelo console), mas é a rota que permitiria
automatizar o cadastro do webhook.

### `GET /push/get_app_push_config` — ler a configuração atual
Útil para diagnosticar "por que o push não chega": mostra a `callback_url`
registrada e quais códigos estão ligados.

### `GET /push/get_lost_push_message` — recuperar pushes perdidos
`v2.push.get_lost_push_message` · Public

Devolve as mensagens perdidas nos **últimos 3 dias** ainda não confirmadas.

> **Este é o melhor candidato a próxima implementação.** Hoje a rede embaixo
> do push é a varredura por janela de tempo, que funciona mas relê pedidos à
> toa. Esta rota entrega exatamente o que se perdeu.

### `POST /push/confirm_consumed_lost_push_message`
`last_message_id` **obrigatório** — o id devolvido pela rota acima. Sem
confirmar, as mesmas mensagens voltam.

---

## Logística — o que ainda não fazemos

**A maior lacuna da integração.** Hoje importamos o pedido e damos baixa no
estoque, mas o despacho é feito à mão no painel da Shopee. Um pedido não sai
sem passar por estas rotas.

| Rota | Método | O que faz |
|---|---|---|
| `/logistics/get_shipping_parameter` | GET | **Comece por aqui.** Diz, em `info_needed`, o que aquele pedido exige: `pickup`, `dropoff` ou `non_integrated` |
| `/logistics/ship_order` | POST | Despacha. Os campos obrigatórios dependem do `info_needed` acima |
| `/logistics/get_tracking_number` | GET | Código de rastreio do pedido |
| `/logistics/create_shipping_document` | POST | Gera a etiqueta (até 50 pedidos) |
| `/logistics/get_shipping_document_result` | POST | Confere se a etiqueta ficou pronta |
| `/logistics/download_shipping_document` | POST | Baixa o arquivo — responde **binário**, não JSON |
| `/logistics/get_channel_list` | GET | Canais de envio habilitados na loja |

O fluxo é: `get_shipping_parameter` → `ship_order` → `create_shipping_document`
→ `get_shipping_document_result` → `download_shipping_document`.

> `download_shipping_document` devolve um arquivo. Nosso `ShopeeApiClient`
> hoje assume JSON — ele precisaria de um caminho para resposta binária.

---

## Devoluções — o que ainda não fazemos

| Rota | Método | Campos |
|---|---|---|
| `/returns/get_return_list` | GET | `page_no`, `page_size` obrigatórios; filtros por data e status |
| `/returns/get_return_detail` | GET | `return_sn` obrigatório |

Hoje tratamos o status `TO_RETURN` do pedido, que devolve a peça ao estoque.
Isso cobre o efeito no saldo, mas não o **fluxo** de devolução — negociação,
prova, compensação. Se as devoluções crescerem, é aqui.

---

## O que chamamos hoje

Seis rotas de loja e duas públicas:

| Rota | Onde |
|---|---|
| `/auth/token/get` | `shopee-auth.service.ts` |
| `/auth/access_token/get` | `shopee-auth.service.ts` |
| `/product/get_item_list` | `shopee-inventory.service.ts` |
| `/product/get_item_base_info` | `shopee-inventory.service.ts` |
| `/product/get_model_list` | `shopee-inventory.service.ts` |
| `/product/update_stock` | `shopee-inventory.service.ts` |
| `/order/get_order_list` | `shopee-order.service.ts` |
| `/order/get_order_detail` | `shopee-order.service.ts` |

Todas passam por `ShopeeApiClient`, que assina, impõe timeout de 15 s e
traduz erro. Nenhum outro lugar do sistema conhece a Shopee.

---

## Erros que valem tratar

O cliente já classifica em retentável ou não:

| `error` | Retenta? | O quê |
|---|---|---|
| `error_rate_limit` | sim | limite de taxa — interrompe o ciclo inteiro, não só a mensagem |
| `error_busy`, `error_server`, `error_inner` | sim | falha do lado deles |
| `invalid_access_token`, `error_auth` | renova e repete uma vez | token vencido |
| `error_sign` | **não** | chave errada, caminho curto assinado, ou relógio fora de hora |
| `error_param` | **não** | payload inválido — retentar não conserta |

Ver `shopee-api.client.ts`.

---

## Próximos passos, em ordem de retorno

1. **`get_lost_push_message`** — rede mais precisa que a varredura por janela
2. **Push código 2** (desautorização) — hoje descobrimos tarde
3. **`get_item_promotion`** — evita falha silenciosa de estoque em campanha
4. **Logística** — tira o despacho do painel da Shopee
5. **Paginação de `get_item_list`** — quando passar de 100 anúncios
