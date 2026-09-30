# Deploy — loja na Cloudflare, API na EC2

Passo a passo para colocar o sistema no ar do zero, com o domínio
`studiocamada.com`. Siga **na ordem**: cada passo usa algo que o anterior
criou.

```
                          Cloudflare
                ┌────────────────────────────────────┐
navegador ────▶ │ studiocamada.com      → Worker     │  loja + painel (Next.js)
                │ img.studiocamada.com  → bucket R2  │  fotos dos produtos
                │ api.studiocamada.com  → túnel ─────┼──┐
                └────────────────────────────────────┘  │ o túnel é aberto DE DENTRO
                                                        │ da EC2 — nenhuma porta
                          AWS EC2                       │ de entrada
                ┌────────────────────────────────────┐  │
                │ cloudflared ◀──────────────────────┼──┘
                │     └──▶ api:4000 ──▶ mongo        │  Docker Compose
                └────────────────────────────────────┘
```

**Por que duas casas.** A loja é um Worker: sem servidor, escala sozinha, e o
plano gratuito cobre com folga. A API e o banco **não rodam em Worker**: o
Mongoose abre TCP para o Mongo, o worker da Shopee vive num intervalo com lock,
e o Express desembrulha o corpo cru para conferir assinatura de webhook. Por
isso eles precisam de uma máquina de verdade.

| Passo | Onde | O que sai dele |
|---|---|---|
| [0](#0--o-que-ter-em-mãos) | seu computador | segredos gerados |
| [1](#1--imagem-da-api-no-github) | GitHub | imagem `forma-api` publicada |
| [2](#2--criar-a-ec2) | AWS | instância rodando |
| [3](#3--preparar-a-instância) | EC2 | Docker e swap |
| [4](#4--criar-o-túnel) | Cloudflare | token do túnel |
| [5](#5--subir-a-api) | EC2 | `https://api.studiocamada.com` respondendo |
| [6](#6--publicar-a-loja) | Cloudflare | Worker com build verde |
| [7](#7--domínio-da-loja) | Cloudflare | `https://studiocamada.com` abrindo a loja |
| [8](#8--imagens-no-r2) | Cloudflare + painel | fotos servidas por `img.studiocamada.com` |
| [9](#9--primeiro-acesso-e-integrações) | painel | login, Mercado Pago, Shopee |
| [10](#10--backup) | EC2 e R2 | backup de hora em hora, cifrado, fora do servidor |

---

## 0 · O que ter em mãos

- Conta **AWS**
- Conta **Cloudflare** com `studiocamada.com` na lista de domínios (comprado
  lá, ele já aparece como zona ativa)
- O repositório no **GitHub**, com o CI verde na `main`

Gere os segredos agora, no seu computador, e guarde num gerenciador de senhas.
Eles serão pedidos em mais de um lugar:

```bash
openssl rand -base64 48   # JWT_SECRET       — só na EC2
openssl rand -hex 32      # STORE_API_KEY    — na EC2 E na Cloudflare, idêntico
openssl rand -base64 18   # ADMIN_PASSWORD   — a senha do painel
```

> **Não use a `ADMIN_PASSWORD` do `.env.example`** (`forma-admin-2026`). Ela
> está versionada e é pública.

---

## 1 · Imagem da API no GitHub

A EC2 **nunca constrói** a API: `nest build` numa `t3.micro` trava ou leva dez
minutos. Quem constrói é o GitHub Actions
(`.github/workflows/publish-api.yml`), depois de cada push na `main` **cujo CI
passou**. Push com o CI vermelho não gera imagem.

1. No GitHub, abra **Actions** e confirme que **Publica a imagem da API**
   rodou verde. Se nunca rodou, abra o workflow e use **Run workflow**.
2. A imagem fica em **seu perfil → Packages → `forma-api`**, com duas tags:
   - `main` — a mais recente;
   - `sha-<commit>` — para voltar a uma versão específica.
3. O pacote nasce **privado**. Deixe assim e crie um token para a EC2 baixar:
   **Settings → Developer settings → Personal access tokens → Tokens
   (classic) → Generate new token**, só com o escopo **`read:packages`**.
   Guarde o token: ele é o `GHCR_TOKEN` do passo 5.

---

## 2 · Criar a EC2

### Antes: o free tier mudou

| Conta AWS criada | O que você tem |
|---|---|
| antes de 15/07/2025 | 750 h/mês de `t2.micro`/`t3.micro` por 12 meses |
| a partir de 15/07/2025 | até **US$ 200 em créditos, por 6 meses** — depois, preço cheio |

Confira qual é a sua. No modelo novo, uma `t3.micro` ligada o mês inteiro
consome crédito, e no mês 7 a conta chega.

### Papel para entrar sem SSH

O acesso é pelo **Session Manager** (SSM): terminal no navegador, sem porta 22
e sem chave `.pem` para perder.

1. **IAM → Roles → Create role**
2. Trusted entity: **AWS service** → **EC2**
3. Permissão: **`AmazonSSMManagedInstanceCore`**
4. Nome: `forma-ec2-ssm` → **Create role**

### A instância

**EC2 → Launch instance**:

| Campo | Valor |
|---|---|
| Name | `forma-api` |
| AMI | **Ubuntu Server 24.04 LTS** (já vem com o agente do SSM) |
| Instance type | `t3.micro` (2 vCPU burstável, 1 GB) |
| Key pair | **Proceed without a key pair** |
| Network → Security group | criar um novo, **sem nenhuma regra de entrada** — apague a regra de SSH que o assistente sugere |
| Storage | **20 GiB gp3** |
| Advanced details → IAM instance profile | `forma-ec2-ssm` |

**Launch instance.** Sem regra de entrada nenhuma: nem 22, nem 80, nem 443. O
túnel sai da instância para a Cloudflare, e o SSM também é uma conexão de
saída.

Por que 20 GB: só a imagem do `mongo:7` ocupa 1,2 GB, e as versões antigas da
API se acumulam até alguém rodar `docker image prune`.

### Entrar na instância

**EC2 → Instances → `forma-api` → Connect → Session Manager → Connect.** Se o
botão estiver cinza, espere 2–3 minutos depois do boot: o agente precisa se
registrar.

A sessão abre como `ssm-user`. Troque para o usuário padrão, que é o dono de
tudo daqui para frente:

```bash
sudo -iu ubuntu
```

---

## 3 · Preparar a instância

Tudo abaixo roda **dentro da EC2**, como `ubuntu`.

```bash
sudo apt-get update && sudo apt-get upgrade -y

# Docker (com o plugin do compose)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit                 # sai e entra de novo para o grupo valer
sudo -iu ubuntu
docker compose version
```

### Swap — não pule

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h              # a linha "Swap" tem de mostrar 2.0Gi
```

Sem swap, 1 GB com Docker + Mongo + API é convite para o OOM killer. E quem ele
escolhe costuma ser o processo maior: o banco, no meio de um pedido.

O consumo medido em regime normal é pequeno (API ~51 MB, Mongo ~63 MB,
cloudflared ~30 MB). O que aperta é o pico, e é para ele que existem o swap e
o teto de cache do Mongo no compose.

### Atualizações de segurança automáticas

```bash
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades   # responda "Yes"
```

---

## 4 · Criar o túnel

### O que um túnel é

Normalmente você **abre uma porta** e espera que só gente boa bata nela. O
túnel inverte: o `cloudflared` roda na EC2 e **liga para a Cloudflare**,
mantendo a linha aberta. As requisições para `api.studiocamada.com` chegam na
Cloudflare e descem por essa linha. Por isso não há porta aberta, certificado
para instalar nem necessidade de IP fixo.

### Os passos

No painel da Cloudflare, em **Networking → Tunnels** (o caminho antigo,
**Zero Trust → Networks → Tunnels**, também serve), clique em **Create a
tunnel**:

1. Tipo **Cloudflared**, nome `forma-api` → **Save tunnel**
2. A tela seguinte oferece instaladores para vários sistemas. **Ignore todos**:
   o `cloudflared` já está no `docker-compose.prod.yml`. Copie só o **token**,
   o texto longo depois de `--token` no comando de instalação.
3. **Next**, e em **Public Hostname** preencha:

| Campo | Valor |
|---|---|
| Subdomain | `api` |
| Domain | `studiocamada.com` |
| Service → Type | `HTTP` |
| Service → URL | `api:4000` |

4. **Save.** A Cloudflare cria sozinha o DNS de `api.studiocamada.com`.

`api:4000` é o **nome do serviço na rede do compose**, não um IP. O
`cloudflared` roda como contêiner ao lado da API e a alcança por dentro. É por
isso que a API não publica porta.

> **Guarde o token como senha.** Quem o tiver publica um túnel na sua conta.

O túnel aparece como **Inactive** até o passo 5. É o esperado.

---

## 5 · Subir a API

De volta à EC2, como `ubuntu`.

### Baixar os arquivos

```bash
mkdir -p ~/forma && cd ~/forma
BASE=https://raw.githubusercontent.com/SEU_USUARIO/forma-ecommerce/main
curl -fsSLO "$BASE/docker-compose.prod.yml"
curl -fsSLO "$BASE/scripts/backup-mongo.sh"
curl -fsSLO "$BASE/scripts/restore-mongo.sh"
chmod +x backup-mongo.sh restore-mongo.sh
```

Se o repositório for privado, o `raw.githubusercontent.com` responde 404.
Nesse caso, copie o conteúdo dos três arquivos do GitHub e cole com
`nano docker-compose.prod.yml` (e o mesmo para os scripts).

### Autenticar no registry

```bash
echo 'COLE_O_GHCR_TOKEN' | docker login ghcr.io -u SEU_USUARIO --password-stdin
```

### O `.env`

```bash
cat > .env <<'ENV'
API_IMAGE=ghcr.io/SEU_USUARIO/forma-api:main

JWT_SECRET=<do passo 0>
ADMIN_EMAIL=<o e-mail com que você vai entrar no painel>
ADMIN_PASSWORD=<do passo 0>
ADMIN_NAME=<seu nome>

CLOUDFLARE_TUNNEL_TOKEN=<do passo 4>

# Precisa ser a URL PÚBLICA real: vai nas back_urls do Mercado Pago e na base
# da assinatura do webhook da Shopee.
PUBLIC_API_URL=https://api.studiocamada.com
PUBLIC_SITE_URL=https://studiocamada.com

# Aceita lista separada por vírgula. Sem a origem da loja, o login do painel
# falha no CORS.
CORS_ORIGIN=https://studiocamada.com,https://www.studiocamada.com

# O MESMO valor vai na Cloudflare, no passo 6.
STORE_API_KEY=<do passo 0>
ENV

chmod 600 .env
```

`SEU_USUARIO` é o dono do repositório no GitHub, **em minúsculas**. O registry
recusa maiúsculas.

### Subir

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml --profile tunnel up -d
```

O `--profile tunnel` é o que sobe o `cloudflared`. **Sem ele, a API e o banco
sobem inalcançáveis**, de propósito: expor é uma decisão consciente.

### Conferir

```bash
docker compose -f docker-compose.prod.yml ps
# forma-mongo (healthy), forma-api e forma-tunnel, todos "Up"

docker compose -f docker-compose.prod.yml logs cloudflared | grep Registered
# "Registered tunnel connection" — normalmente quatro linhas

docker compose -f docker-compose.prod.yml logs api | tail -20
# sem erro de variável; o admin é criado na primeira subida
```

E, **do seu computador**:

```bash
curl -s https://api.studiocamada.com/api/v1/health
```

No painel da Cloudflare, o túnel passa a **Healthy**.

**Só siga para o passo 6 quando esse `curl` responder.** A loja é construída
apontando para esse endereço.

---

## 6 · Publicar a loja

A loja é construída e publicada pelo **Workers Builds** a cada push na `main`.
O adaptador OpenNext (`open-next.config.ts`) transforma a saída do Next num
Worker, e o `scripts/build.mjs` só o aciona dentro da Cloudflare.

### Conectar o repositório (uma vez)

Se o Worker `forma-ecommerce` ainda não existe:

1. **Workers & Pages → Create → Workers → Import a repository**
2. Autorize o GitHub e escolha `forma-ecommerce`
3. **Project name: `forma-ecommerce`**. Tem de ser igual ao `name` do
   `wrangler.jsonc`, senão o build falha.

Se ele já existe, abra **Workers & Pages → forma-ecommerce → Settings →
Build** e confira os mesmos campos abaixo.

### Configuração de build

| Campo | Valor |
|---|---|
| Git branch (production) | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` |
| Root directory | `/` |

### Variáveis de build

Em **Settings → Build → Variables and secrets**:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.studiocamada.com` |
| `NODE_VERSION` | `22` |

`NEXT_PUBLIC_API_URL` é **embutida no bundle durante o build**, na loja, no
painel e no `connect-src` da CSP. Mudar o valor sem reconstruir não muda nada.

`API_URL` não é necessária aqui. O código lê `API_URL ??
NEXT_PUBLIC_API_URL`, e em produção os dois seriam o mesmo endereço. Deixe de
fora: variável de texto criada no painel é **apagada a cada `wrangler deploy`**
quando o `wrangler.jsonc` não a declara.

### Segredo de runtime

Em **Settings → Variables and Secrets** (a seção do Worker, não a do build) →
**Add**:

| Tipo | Nome | Valor |
|---|---|---|
| **Secret** | `STORE_API_KEY` | o mesmo do `.env` da EC2 |

É com ela que o servidor da loja se apresenta à API. Com a chave nos dois
lados, checkout, orçamento, cobrança e login do painel **só aceitam chamadas
vindas da loja**, e o limite de tentativas passa a contar por cliente, não pelo
IP do Worker. Os valores precisam ser **idênticos**; diferentes, o checkout
inteiro responde 403.

Tem de ser **Secret**, não Text: segredo sobrevive ao `wrangler deploy`,
variável de texto não.

### Disparar o build

**Deployments → Retry build** no último, ou faça um push na `main`.
Acompanhe o log. No fim, o Worker responde em
`https://forma-ecommerce.<sua-conta>.workers.dev`. Abra e confira se o catálogo
carrega com os produtos da API.

---

## 7 · Domínio da loja

1. **Workers & Pages → forma-ecommerce → Settings → Domains & Routes → Add →
   Custom domain** → `studiocamada.com` → **Add domain**
2. Repita para `www.studiocamada.com`
3. A Cloudflare cria o DNS e emite o certificado. Leva de segundos a poucos
   minutos.

### Mandar o `www` para o domínio principal

A loja se anuncia em `studiocamada.com` (`SITE_URL` em `lib/constants.ts`:
canonical, sitemap, JSON-LD). O `www` deve redirecionar para lá, senão o Google
indexa dois endereços para a mesma página.

**studiocamada.com (a zona) → Rules → Redirect Rules → Create rule → template
"Redirect from WWW to Root"** → **Deploy**.

### Conferir

```bash
curl -sI https://studiocamada.com | head -1          # HTTP/2 200
curl -sI https://www.studiocamada.com | grep -i location
# location: https://studiocamada.com/
```

A partir daqui, `https://studiocamada.com` é a loja, e
`https://studiocamada.com/admin` é o painel.

---

## 8 · Imagens no R2

As fotos dos produtos ficam num bucket R2 servido por `img.studiocamada.com`.
O passo a passo completo, com criação de bucket, chaves e o porquê de cada
coisa, está em [`IMAGENS.md`](IMAGENS.md). O resumo:

1. **R2 → `forma-data` → Settings → Custom Domains → Connect Domain** →
   `img.studiocamada.com`
2. **R2 → Manage API tokens** → token com **Object Read & Write** só nesse
   bucket
3. No painel da loja, em **Integrações → Imagens**, grave o Account ID, o
   bucket, `https://img.studiocamada.com` e as duas chaves. Depois clique em
   **Testar conexão**.
4. No Worker, adicione a variável de **build**
   `NEXT_PUBLIC_IMAGE_BASE_URL = https://img.studiocamada.com` e **refaça o
   build**

O item 4 é o que costuma faltar. Sem ele, a CSP e o `next/image` não conhecem o
host: a página carrega normalmente e só a foto some.

---

## 9 · Primeiro acesso e integrações

### Painel

Entre em `https://studiocamada.com/admin/login` com o `ADMIN_EMAIL` e a
`ADMIN_PASSWORD` do `.env`. Se o login falhar com erro de CORS no console do
navegador, o `CORS_ORIGIN` da EC2 não tem a origem de onde você abriu a página.

### Mercado Pago

1. No [painel de desenvolvedor](https://www.mercadopago.com.br/developers/panel),
   em **Suas integrações → a aplicação → Webhooks**:
   - URL de produção: `https://api.studiocamada.com/api/v1/payments/mercadopago/webhook`
   - Evento: **Pagamentos**
2. Copie a **assinatura secreta** gerada.
3. No painel da loja, em **Integrações → Mercado Pago**, grave o **Access
   token** de produção e o **Segredo do webhook**.

Sem o segredo, a API **recusa** todo webhook. É de propósito: aceitar sem
conferir deixaria qualquer um marcar pedido como pago.

### Shopee

Siga [`CONECTAR_SHOPEE.md`](CONECTAR_SHOPEE.md). A Push URL a cadastrar é
`https://api.studiocamada.com/api/v1/shopee/webhook`, e ela precisa bater
**exatamente** com o `PUBLIC_API_URL`, porque entra na assinatura.

---

## 10 · Backup

O banco roda na EC2, e sem cópia fora dela os pedidos morrem junto com o
disco, com um `docker compose down -v` errado ou com uma invasão. Aqui o
backup sai **de hora em hora**, **cifrado**, para um bucket R2 **privado** que
**não aceita apagar** as cópias por 30 dias.

A peça central é a cifra por chave pública (`age`): o servidor guarda só a
chave PÚBLICA — cifra, mas não decifra. A chave privada fica com você. Quem
invadir a EC2 ou roubar o token do R2 leva arquivos ilegíveis.

### 1. A chave de cifra — no SEU computador, não na EC2

```bash
# macOS: brew install age · Ubuntu: sudo apt install age · Windows: winget install FiloSottile.age
age-keygen -o chave-backup-camada.txt
# Public key: age1....   ← esta vai para a EC2
```

Guarde `chave-backup-camada.txt` em **dois** lugares seguros (o gerenciador
de senhas e um pendrive, por exemplo). **Sem ela, nenhum backup pode ser
restaurado** — nem por você.

### 2. O bucket de backup — no painel da Cloudflare

1. **R2 → Create bucket** → `camada-backups`. **Não** conecte domínio nem
   ative acesso público: é um bucket privado, diferente do `forma-data`, que
   serve as fotos para qualquer um.
2. **`camada-backups` → Settings → Bucket lock rules → Add rule**: prefixo
   `mongo/`, retenção de **30 dias**. Durante esse prazo nenhum arquivo pode
   ser apagado ou sobrescrito — nem com o token da EC2, que não tem permissão
   de mexer na configuração do bucket.
3. **Settings → Object lifecycle rules → Add rule**: prefixo `mongo/`, apagar
   objetos depois de **35 dias**. Sem isso o bucket só cresce.
4. **R2 → Manage API tokens → Create API token**: permissão **Object Read &
   Write**, **aplicada só ao bucket `camada-backups`**. Anote o Access Key ID e
   o Secret Access Key — o segredo só aparece uma vez.

### 3. A configuração — na EC2

```bash
cd ~/forma
sudo apt install -y age
cat > backup.env <<'ENV'
R2_ACCOUNT_ID=<o Account ID da Cloudflare>
R2_BUCKET=camada-backups
R2_ACCESS_KEY_ID=<do token do passo 2.4>
R2_SECRET_ACCESS_KEY=<do token do passo 2.4>
BACKUP_AGE_RECIPIENT=<a linha age1... do passo 1>
# Opcional, e recomendado — ver "Ser avisado quando parar", abaixo.
BACKUP_PING_URL=
ENV
chmod 600 backup.env
./backup-mongo.sh
```

A última linha precisa terminar com `Conferido no R2: camada-backups/mongo/...`.

### 4. Automatizar

```bash
crontab -e
```

```cron
0 * * * * cd /home/ubuntu/forma && ./backup-mongo.sh >> /home/ubuntu/forma/backup.log 2>&1
```

De hora em hora: no pior caso, perde-se uma hora de pedidos. O servidor
guarda as últimas 48 cópias; o R2, 30 a 35 dias.

### Ser avisado quando parar

Backup que falha em silêncio é descoberto no dia em que mais se precisa dele.
Crie um check gratuito em [healthchecks.io](https://healthchecks.io) com
período de **1 hora** e tolerância de **1 hora**, e ponha a URL dele em
`BACKUP_PING_URL`. O script avisa a cada sucesso e a cada falha; se o aviso
parar de chegar — cron quebrado, disco cheio, instância desligada —, o
healthchecks manda e-mail.

### Restaurar

Procedimento completo, inclusive a partir de um servidor novo, e o ensaio
trimestral: [`RUNBOOK.md`](RUNBOOK.md). **Faça o primeiro ensaio antes de
lançar a loja.**

---

## Atualizar

**Loja:** push na `main`. O Workers Builds reconstrói e publica sozinho.

**API:** push na `main` → o CI passa → a imagem `main` é republicada. Depois,
na EC2:

```bash
cd ~/forma
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml --profile tunnel up -d
docker image prune -f          # o disco de 20 GB enche com imagens antigas
```

Repita o `--profile tunnel` em todo `up`.

**Voltar uma versão da API:** troque `API_IMAGE` no `.env` para
`ghcr.io/SEU_USUARIO/forma-api:sha-<commit que funcionava>` e repita o `pull`
e o `up`.

**Mudou alguma `NEXT_PUBLIC_*`?** Refaça o build da loja. Elas não são lidas em
runtime.

---

## Resolução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Botão **Connect → Session Manager** cinza | papel IAM ausente, ou agente ainda subindo | confira o IAM instance profile; espere 3 min; **Reboot** |
| `docker compose pull` com `denied` | sem login no ghcr, ou token sem `read:packages` | refaça o `docker login` do passo 5 |
| `docker compose` reclama de variável | o `:?` do compose fez o trabalho dele | a mensagem nomeia a que falta no `.env` |
| Nada responde, e você não passou `--profile` | sem porteiro, nada é exposto | `up -d` com `--profile tunnel` |
| Túnel **Inactive** / `api.` não resolve | `cloudflared` fora do ar ou token errado | `logs cloudflared` |
| **502** em `api.studiocamada.com` | a API não subiu | `logs api` — provavelmente falta variável |
| Build do Worker falha com nome divergente | projeto na Cloudflare ≠ `name` do `wrangler.jsonc` | renomeie um dos dois para `forma-ecommerce` |
| Loja no ar mas sem produtos da API | `NEXT_PUBLIC_API_URL` ausente no build | variável de **build** + refazer o build |
| Painel: *"Refused to connect"* | CSP sem a API — o build rodou sem `NEXT_PUBLIC_API_URL` | idem |
| Login do painel falha com erro de CORS | `CORS_ORIGIN` sem a origem da loja | corrija o `.env` e `up -d` |
| Checkout ou login com 403 *"Esta rota atende só a loja"* | `STORE_API_KEY` diferente (ou ausente) na Cloudflare | o mesmo valor nos dois lados |
| Foto some, página carrega | `NEXT_PUBLIC_IMAGE_BASE_URL` ausente ou ≠ painel | ver passo 8 |
| Webhook do Mercado Pago recusado | segredo do webhook não gravado no painel | passo 9 |
| Webhook da Shopee recusado | `PUBLIC_API_URL` ≠ URL cadastrada lá | acerte os dois |
| API reinicia sozinha | OOM | `free -h` (o swap está ativo?) e `docker stats` |
| Mongo não sobe | volume corrompido, ou disco cheio | `df -h`; restaure pelo RUNBOOK |

Para ver o que está consumindo memória:

```bash
docker stats --no-stream
free -h
```

---

## Sem domínio próprio: perfil `caddy`

O compose tem um segundo porteiro para quem **não** tem domínio na Cloudflare:
o Caddy, com um nome grátis do [DuckDNS](https://www.duckdns.org) e
certificado do Let's Encrypt. As diferenças para o túnel:

- O Security Group precisa liberar **80 e 443** de `0.0.0.0/0`. A 80 é por onde
  o Let's Encrypt confirma que o nome é seu.
- O nome precisa apontar para o IP público da EC2 **antes** da primeira subida
  (`dig +short SEU-NOME.duckdns.org`). Esse IP muda ao parar e iniciar a
  instância. Um Elastic IP resolve, mas a AWS cobra por IPv4 público.
- No `.env`, troque `CLOUDFLARE_TUNNEL_TOKEN` por `API_DOMAIN=SEU-NOME.duckdns.org`
  e use `PUBLIC_API_URL=https://SEU-NOME.duckdns.org`.
- Baixe também o `Caddyfile` e suba com `--profile caddy`.
- Para confirmar, procure `certificate obtained successfully` em
  `logs caddy`.

Com `studiocamada.com` na conta, o túnel é o melhor arranjo: nenhuma porta
aberta e nenhum IP para acompanhar.

---

## O que este desenho não resolve

**É uma instância só.** Reiniciar para atualizar o sistema derruba a API por
alguns minutos, e perder o volume perde o banco. Por isso o backup fora da
máquina não é opcional.

**O worker da Shopee assume um processo.** Duas instâncias dobram a varredura e
o consumo do limite de taxa da Shopee. O lock do outbox impede trabalho
duplicado, mas o desenho hoje é de réplica única. Para escalar,
`SHOPEE_WORKER=off` em todas menos uma.

**Sem monitoramento.** Se a instância cair às 3h, você descobre quando alguém
reclamar. Um check externo batendo em `/api/v1/health` resolve barato. O
Health Checks da própria Cloudflare ou o UptimeRobot gratuito servem.
