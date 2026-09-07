# Backend numa EC2, com Cloudflare Tunnel

A loja fica na Cloudflare. **A API e o banco precisam de um servidor** — não
rodam em Worker: o Mongoose abre TCP para o Mongo, o worker da Shopee vive num
intervalo com lock, e o Express desembrulha corpo cru para conferir assinatura.

Este documento sobe os dois numa EC2 e os expõe por HTTPS **sem abrir porta
nenhuma**.

---

## Escolha o porteiro antes de tudo

A API e o Mongo **nunca** publicam porta. Quem expõe é um dos dois porteiros, e
a escolha depende de uma única coisa: **você tem um domínio na sua conta
Cloudflare?**

| | `--profile caddy` | `--profile tunnel` |
|---|---|---|
| Precisa de domínio próprio | **não** — DuckDNS dá um de graça | **sim**, na conta Cloudflare |
| Portas abertas | 80 e 443 | **nenhuma** |
| Certificado | Let's Encrypt, o Caddy renova | a Cloudflare cuida |
| Custo | zero | zero |

**Sem domínio, use `caddy`.** Trocar depois é trocar uma palavra no comando —
nada mais no arquivo muda.

```
                    ┌─ perfil caddy ──────────────────────────┐
forma-api           │  :80 :443  caddy → api → mongo          │
  .duckdns.org  ───▶│  Security Group: só 80 e 443            │
                    └─────────────────────────────────────────┘

                    ┌─ perfil tunnel ─────────────────────────┐
api.seudominio.com  │  cloudflared → api → mongo              │
              ─────▶│  Security Group: NADA entra             │
                    └─────────────────────────────────────────┘
```

---

## Antes de começar

### O free tier mudou

| Conta criada | O que você tem |
|---|---|
| antes de 15/07/2025 | 750 h/mês de `t2.micro`/`t3.micro` por 12 meses |
| a partir de 15/07/2025 | até **US$ 200 em créditos, por 6 meses** — depois, preço cheio |

Confira qual é a sua **antes** de dimensionar. Uma `t3.micro` ligada o mês
inteiro consome crédito no modelo novo, e no mês 7 a conta chega.

### Instância

- **Tipo:** `t3.micro` (2 vCPU burstável, 1 GB)
- **Imagem:** Ubuntu Server LTS
- **Disco:** 20 GB gp3 (o volume do Mongo e as imagens Docker cabem; a imagem
  do `mongo:7` sozinha ocupa 1,2 GB)
- **Security Group:** nada de entrada. Nem 443, nem 80. Acesso administrativo
  por **SSM Session Manager**, que também dispensa a porta 22.

Se preferir SSH, libere a 22 só para o seu IP — nunca `0.0.0.0/0`.

### O consumo real

Medido nos contêineres em execução, com o banco praticamente vazio:

| Serviço | Memória |
|---|---|
| API | ~51 MB |
| Mongo | ~63 MB |
| cloudflared | ~30 MB |

Cabe com folga em 1 GB. O que aperta não é o regime normal — é o pico. Daí o
swap e o teto de cache do Mongo abaixo.

---

## 1 · Preparar a instância

```bash
sudo apt-get update && sudo apt-get upgrade -y

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker
```

### Swap — não pule

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Sem swap, 1 GB com Docker + Mongo + API é convite para o OOM killer. E quem
ele escolhe costuma ser o processo maior — o banco, no meio de um pedido.

### Atualizações de segurança automáticas

```bash
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 2A · Nome grátis com DuckDNS  *(perfil `caddy` — sem domínio próprio)*

**Pule para 2B se você tem domínio na Cloudflare.**

O DuckDNS dá um subdomínio permanente e gratuito. Não é bonito, mas é um nome
DNS de verdade: o Let's Encrypt emite certificado para ele, e a Shopee e o
Mercado Pago aceitam sem diferença.

1. Entre em <https://www.duckdns.org> e faça login (GitHub, Google…)
2. Em **domains**, escolha um nome — `forma-api`, por exemplo — e **add domain**
3. Na coluna **current ip**, ponha o **IP público da sua EC2** e **update ip**
4. Guarde o **token** da conta: serve se um dia quiser atualizar o IP por script

Você fica com `forma-api.duckdns.org`. Confirme que resolve **antes** de subir —
o Let's Encrypt confirma a posse batendo na porta 80, e falha se o nome ainda
não apontar para a instância:

```bash
dig +short forma-api.duckdns.org     # tem de devolver o IP da EC2
```

> **O IP da EC2 muda ao parar e iniciar a instância.** Se isso acontecer,
> atualize no DuckDNS. Um Elastic IP evita o problema, mas a AWS cobra por
> endereço IPv4 público desde 2024 — no free tier legado isso está coberto por
> 12 meses; no modelo de créditos, sai do saldo.

### Security Group para este perfil

Entrada: **80** e **443** de `0.0.0.0/0`. Nada além. A 80 é necessária: é por
ela que o Let's Encrypt confirma que o nome é seu.

---

## 2B · Criar o túnel  *(perfil `tunnel` — exige domínio na Cloudflare)*

### O que um túnel é

Normalmente você **abre uma porta** e espera que só gente boa bata nela. O
túnel inverte: um programa (`cloudflared`) roda dentro da EC2 e **liga para a
Cloudflare**, mantendo a linha aberta. As requisições chegam na Cloudflare e
são empurradas por essa linha já existente — por isso não há porta de entrada,
nem certificado para instalar, nem necessidade de IP fixo.

### Os passos

No painel da Cloudflare em **Networking → Tunnels** (o caminho antigo,
**Zero Trust → Networks → Tunnels**, também serve) → **Create a tunnel**:

1. Tipo **Cloudflared**, dê um nome (`forma-api`)
2. A tela seguinte oferece instaladores para vários sistemas — **ignore todos**,
   o `cloudflared` já está no compose. O que você quer é só o **token**: é o
   texto longo que aparece depois de `--token` no comando de instalação
3. Em **Public Hostnames**, adicione:

| Campo | Valor |
|---|---|
| Subdomain | `api` |
| Domain | `seudominio.com` |
| Service | `HTTP` → `api:4000` |

`api:4000` é o **nome do serviço na rede do compose**, não um IP. O
`cloudflared` roda como contêiner ao lado da API e a alcança por dentro — é por
isso que a API não publica porta.

> **Guarde o token como senha.** Quem o tiver publica um túnel na sua conta.

---

## 3 · Publicar a imagem da API

O CI faz isso a cada push em `main` que toque em `api/`
(`.github/workflows/publish-api.yml`). A instância **nunca constrói** — `nest
build` numa t3.micro trava ou leva dez minutos, e um deploy que depende disso
falha justamente quando há pressa.

A imagem sai em `ghcr.io/<seu-usuario>/forma-api`, com duas tags: `main` (a
mais recente) e o SHA do commit (para voltar a uma versão específica).

**Se o pacote estiver privado**, autentique a instância uma vez:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u SEU_USUARIO --password-stdin
```

O `GHCR_TOKEN` é um Personal Access Token com escopo `read:packages`.

---

## 4 · Configurar e subir

```bash
mkdir -p ~/forma && cd ~/forma
BASE=https://raw.githubusercontent.com/SEU_USUARIO/forma-ecommerce/main
curl -fsSLO "$BASE/docker-compose.prod.yml"
curl -fsSLO "$BASE/Caddyfile"        # só para o perfil caddy
```

Crie o `.env` ao lado:

```bash
cat > .env <<'ENV'
API_IMAGE=ghcr.io/SEU_USUARIO/forma-api:main

JWT_SECRET=<gere com: openssl rand -base64 48>
ADMIN_EMAIL=voce@seudominio.com
ADMIN_PASSWORD=<uma senha forte, não a do exemplo>
ADMIN_NAME=Seu Nome

# Sem domínio próprio (perfil caddy):
API_DOMAIN=forma-api.duckdns.org
PUBLIC_API_URL=https://forma-api.duckdns.org

# Com domínio na Cloudflare (perfil tunnel), troque as duas de cima por:
#   CLOUDFLARE_TUNNEL_TOKEN=<o token do passo 2B>
#   PUBLIC_API_URL=https://api.seudominio.com

PUBLIC_SITE_URL=https://sua-loja.workers.dev
CORS_ORIGIN=https://sua-loja.workers.dev
ENV

chmod 600 .env
```

Suba com o perfil que você escolheu — **sem `--profile` nada é exposto**:

```bash
# sem domínio próprio
docker compose -f docker-compose.prod.yml --profile caddy up -d

# ou, com domínio na Cloudflare
docker compose -f docker-compose.prod.yml --profile tunnel up -d
```

```bash
docker compose -f docker-compose.prod.yml ps
curl -s https://SEU-ENDERECO/api/v1/health
```

### Como saber se o porteiro subiu

```bash
# perfil caddy — procure "certificate obtained successfully"
docker compose -f docker-compose.prod.yml logs caddy | tail -20

# perfil tunnel — procure "Registered tunnel connection" (normalmente quatro)
docker compose -f docker-compose.prod.yml logs cloudflared | tail -20
```

> **Troque `ADMIN_PASSWORD`.** O padrão do repositório (`forma-admin-2026`)
> está em `.env.example`, versionado e público. Em produção ele é uma porta
> aberta com o endereço escrito na porta.
>
> **`PUBLIC_API_URL` tem que ser a URL real.** Ela vai nas `back_urls` do
> Mercado Pago e entra na base da assinatura do webhook da Shopee — divergir
> do que está cadastrado neles faz toda notificação ser recusada.

---

## 5 · Apontar a loja para a API

Na Cloudflare, em **Workers & Pages → o projeto → Settings → Variables**, como
variáveis de **build**:

```
NEXT_PUBLIC_API_URL = https://api.seudominio.com
API_URL             = https://api.seudominio.com
```

E **refaça o deploy**: `NEXT_PUBLIC_*` é embutida no bundle durante o build —
salvar sem reconstruir não muda nada.

Sem isso, o painel em produção continua chamando `http://localhost:4000` e a
CSP bloqueia, que é o erro que aparece como *"Refused to connect"*.

---

## 6 · Backup

O `scripts/backup-mongo.sh` funciona sem mudança: ele usa `docker exec` no
contêiner `forma-mongo`, que existe igual aqui.

```bash
curl -fsSLO https://raw.githubusercontent.com/SEU_USUARIO/forma-ecommerce/main/scripts/backup-mongo.sh
chmod +x backup-mongo.sh
```

```cron
0 3 * * * cd /home/ubuntu/forma && ./backup-mongo.sh >> /var/log/forma-backup.log 2>&1
```

**Tire o backup da instância.** `./backups` vive no mesmo disco do banco e não
protege contra perda do volume. O jeito mais barato é mandar para o R2 que você
já tem, com `rclone` ou `aws s3 cp` (o R2 fala S3).

Procedimento de restauração e o ensaio trimestral: [`RUNBOOK.md`](RUNBOOK.md).

---

## Atualizar

```bash
cd ~/forma
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker image prune -f          # o disco de 20 GB enche com imagens antigas
```

Para voltar a uma versão anterior, troque `API_IMAGE` para a tag com o SHA do
commit que funcionava e repita.

---

## Resolução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Nada responde, e você não passou `--profile` | sem porteiro, nada é exposto | suba com `--profile caddy` ou `--profile tunnel` |
| Caddy não consegue o certificado | o nome não aponta para a instância, ou a 80 está fechada | `dig +short SEU-NOME`; libere a 80 no Security Group |
| Funcionava e parou depois de parar/iniciar a instância | o IP público mudou | atualize o IP no DuckDNS |
| Domínio não responde (perfil tunnel) | túnel fora do ar | `logs cloudflared` |
| 502 pelo túnel | a API não subiu | `logs api` — provavelmente falta variável no `.env` |
| API reinicia sozinha | OOM | confira o swap (`free -h`) e `docker stats` |
| Mongo não sobe | volume corrompido, ou disco cheio | `df -h`; restaure pelo RUNBOOK |
| Login do painel falha com erro de CORS | `CORS_ORIGIN` sem a origem da loja | corrija o `.env` e `up -d` |
| Webhook da Shopee recusado | `PUBLIC_API_URL` ≠ a URL cadastrada lá | acerte os dois |
| `docker compose` reclama de variável | o `:?` do compose fez o trabalho dele | a mensagem nomeia a que falta |

Para ver o que está consumindo memória:

```bash
docker stats --no-stream
free -h
```

---

## O que este desenho não resolve

**É uma instância só.** Reiniciar para atualizar o sistema derruba a API por
alguns minutos, e perder o volume perde o banco — por isso o backup fora da
máquina não é opcional.

**O worker da Shopee assume um processo.** Rodar duas instâncias dobra a
varredura e o consumo do limite de taxa da Shopee. O lock do outbox impede
trabalho duplicado, mas o desenho hoje é de réplica única; para escalar,
`SHOPEE_WORKER=off` em todas menos uma.

**Sem monitoramento.** Se a instância cair às 3h, você descobre quando alguém
reclamar. Um check externo batendo em `/api/v1/health` resolve barato.
