# Imagens de produto no Cloudflare R2

As fotos ficam num bucket R2 e são servidas por um domínio personalizado. O
arquivo sobe para a **API**, que valida os bytes, assina e grava — a chave S3
nunca chega ao navegador e o bucket não precisa de política de CORS.

---

## Como funciona

```
painel ──(bytes crus)──▶ API ──(SigV4 PUT)──▶ bucket R2
                          │
                          └─ valida magic bytes, gera a chave, define o Content-Type

loja ◀──(GET)── img.seudominio.com ◀── domínio personalizado no bucket
```

| Peça | Arquivo |
|---|---|
| Assinatura SigV4 (pura) | `api/src/modules/storage/sigv4.ts` |
| Detecção de tipo (pura) | `api/src/modules/storage/image-type.ts` |
| Cliente do R2 | `api/src/modules/storage/r2.client.ts` |
| Regras de armazenamento | `api/src/modules/storage/storage.service.ts` |
| Endpoint | `api/src/modules/storage/media.controller.ts` |
| Host compartilhado CSP/next-image | `lib/security/image-host.ts` |
| Envio no painel | `components/admin/product-form.tsx` |

---

## Configurar

### 1. Domínio personalizado no bucket

No painel da Cloudflare: **R2 → forma-data → Settings → Custom Domains →
Connect Domain**, e aponte um subdomínio da sua zona (ex.: `img.seudominio.com`).

Isso é o que torna o bucket legível. Um bucket recém-criado tem
**Public Development URL desativada e nenhum domínio** — nada nele é acessível
por HTTP até este passo.

> A Public Development URL (`pub-xxx.r2.dev`) funciona para experimentar, mas a
> própria Cloudflare limita a taxa dela e desaconselha em produção.

### 2. Credenciais S3

**R2 → Manage API Tokens → Create API Token**, com permissão de
*Object Read & Write* restrita ao bucket `forma-data`. Guarde o **Access Key
ID** e o **Secret Access Key** — o segredo só aparece uma vez.

### 3. Painel

**Integrações → Imagens (Cloudflare R2)**:

| Campo | Valor |
|---|---|
| Account ID | o da sua conta Cloudflare (aparece na URL do painel e em **R2 → Overview**) |
| Bucket | `forma-data` |
| Domínio público de leitura | `https://img.seudominio.com` |
| Access Key ID / Secret Access Key | do passo 2 |

Ligue a integração e use **Testar conexão** — ele faz um `HEAD` numa chave
inexistente: 404 significa credencial boa, 403 significa recusada.

### 4. Build da loja

```bash
NEXT_PUBLIC_IMAGE_BASE_URL=https://img.seudominio.com docker compose build web
docker compose up -d web
```

> **`build`, não só `up`.** A variável é `ARG` do Dockerfile e chega pelo
> `docker-compose.yml` como argumento de build. Defini-la só no ambiente do
> contêiner não tem efeito nenhum — e o sintoma seria a foto sumir da vitrine
> sem erro em lugar nenhum. Trocou o domínio? Refaça o build.

**Tem de ser o mesmo valor do painel.** Dele saem duas coisas que só existem
em tempo de build, e as duas falham em silêncio quando faltam:

- o `img-src` da CSP — sem ele o navegador bloqueia a foto e o resto da página
  carrega normalmente;
- o `images.remotePatterns` do Next — sem ele o `next/image` responde 400.

Os dois leem de `lib/security/image-host.ts`, então não têm como divergir
entre si — mas podem divergir do painel, e é por isso que este passo existe.

---

## Decisões

### O arquivo passa pela API, não direto para o R2

A alternativa seria a API assinar uma URL e o navegador enviar direto. Ela
poupa banda do servidor, mas exigiria política de CORS no bucket e colocaria
uma credencial temporária no cliente. Para o volume desta loja, a banda
economizada não paga a superfície adicional.

### O tipo sai dos bytes, nunca do cliente

`Content-Type` e nome do arquivo são escolhidos por quem envia. Se qualquer um
dos dois decidisse o `Content-Type` gravado, um HTML subiria como imagem e
seria servido pelo domínio das fotos.

**SVG é recusado na entrada.** O `next.config.ts` roda com
`dangerouslyAllowSVG: true`; SVG é um documento que executa script, então SVG
enviado por upload e servido de um domínio nosso seria XSS armazenado. A
mensagem de recusa diz isso, para ninguém tratar como defeito.

Aceitos: **JPEG, PNG, WebP e AVIF**, até **8 MB**.

### A chave é gerada no servidor

`produtos/AAAA-MM-DD/<uuid>.<ext>`. Nome enviado pelo cliente pode conter
`../`, barra invertida ou caractere de controle e viraria caminho dentro do
bucket. O UUID também garante que subir a mesma foto duas vezes não
sobrescreva a anterior, que pode estar em uso por outro produto.

Os objetos vão com `Cache-Control: public, max-age=31536000, immutable` — o
nome é único, então o conteúdo nunca muda para uma mesma URL.

### SigV4 escrito à mão

O projeto conversa com todo serviço externo por `fetch` nativo. Trazer o SDK da
AWS por causa de dois verbos custaria megabytes de dependência transitiva num
repositório que audita dependência de produção no CI.

O risco de escrever à mão é errar um detalhe do canônico e receber 403 sem
explicação. Por isso a função é pura e testada contra os **vetores oficiais da
AWS** (`get-vanilla`, `post-vanilla`, chave derivada), não contra o próprio
comportamento.

### Imagem em `/public` continua valendo

O upload é adição, não substituição. O campo de URL continua aceitando
`/images/products/…`, e os produtos existentes não precisam ser migrados.

### Apagar é separado de excluir o produto

A rota `DELETE /media/products` só aceita chave no padrão `produtos/…` gerado
por nós. Apagar a imagem junto com o produto arriscaria derrubar uma foto que
outro produto ainda usa, e um objeto órfão custa muito menos que isso.

---

## Testes

```bash
docker compose up -d mongo
cd api && npm test
```

- `sigv4.spec.ts` — vetores oficiais da AWS
- `image-type.spec.ts` — HTML e SVG disfarçados, assinatura deslocada, truncado
- `media.controller.spec.ts` — sobe o Nest de verdade e faz HTTP real

O último existe por um motivo específico: o limite de corpo e a captura do
`rawBody` são configuração de **bootstrap**, não de controller. Chamar o
método com um Buffer na mão passaria mesmo que o Express recusasse a
requisição com 413 — e o padrão do Express é 100 kB, menor que qualquer foto.

---

## Resolução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Upload devolve "domínio público" | `publicBaseUrl` vazio no painel | Configure o domínio personalizado e grave a URL |
| Upload 403 / "Credencial recusada" | Token sem permissão de escrita, ou de outro bucket | Recrie o token com *Object Read & Write* no bucket certo |
| Imagem some na loja, página carrega | `NEXT_PUBLIC_IMAGE_BASE_URL` ausente ou diferente | Confira o valor e **refaça o build** — é tempo de build |
| `next/image` responde 400 | Mesma causa acima | Idem |
| Upload 413 sem mensagem | Arquivo acima de 10 MB (limite do parser) | Reduza a imagem |
| "SVG não é aceito" | Recusa deliberada | Converta para PNG ou WebP |

---

## Desligar com segurança

**Integrações → Imagens → Desligar.** O envio para de funcionar; as imagens já
gravadas continuam sendo servidas normalmente, porque quem as serve é o
domínio do bucket, não a aplicação. As URLs nos produtos não são tocadas.

Para parar de servir também, remova o domínio personalizado no painel da
Cloudflare — aí as fotos somem da loja, então faça só se for intencional.
