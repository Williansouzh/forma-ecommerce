# Backend numa EC2, com Cloudflare Tunnel

A loja fica na Cloudflare. **A API e o banco precisam de um servidor** — não
rodam em Worker: o Mongoose abre TCP para o Mongo, o worker da Shopee vive num
intervalo com lock, e o Express desembrulha corpo cru para conferir assinatura.

Este documento sobe os dois numa EC2 e os expõe por HTTPS **sem abrir porta
nenhuma**.

---

## O que você vai ter no fim

```
Cloudflare (loja, Workers)  ──▶  api.seudominio.com
                                        │
                                  Cloudflare Tunnel
                                        │  (conexão aberta DE DENTRO)
                                 ┌──────▼──────────────────┐
                                 │  EC2 t3.micro           │
                                 │  cloudflared → api → mongo │
                                 └─────────────────────────┘
                                   Security Group: nada entra
```

Nenhum serviço publica porta. O `cloudflared` abre a conexão de dentro para
fora, então o Security Group pode recusar **todo** tráfego de entrada — sem
certificado para renovar, sem Elastic IP, sem porta 443 exposta a varredura.

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

## 2 · Criar o túnel

No **Cloudflare Zero Trust → Networks → Tunnels → Create a tunnel**:

1. Tipo **Cloudflared**, dê um nome (`forma-api`)
2. Copie o **token** que aparece — é ele que vai no `.env`
3. Em **Public Hostnames**, adicione:

| Campo | Valor |
|---|---|
| Subdomain | `api` |
| Domain | `seudominio.com` |
| Service | `HTTP` → `api:4000` |

`api:4000` é o nome do serviço na rede do compose. O `cloudflared` roda ao lado
da API e a alcança por dentro — por isso a API não precisa publicar porta.

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
curl -fsSLO https://raw.githubusercontent.com/SEU_USUARIO/forma-ecommerce/main/docker-compose.prod.yml
```

Crie o `.env` ao lado:

```bash
cat > .env <<'ENV'
API_IMAGE=ghcr.io/SEU_USUARIO/forma-api:main

JWT_SECRET=<gere com: openssl rand -base64 48>
ADMIN_EMAIL=voce@seudominio.com
ADMIN_PASSWORD=<uma senha forte, não a do exemplo>
ADMIN_NAME=Seu Nome

PUBLIC_API_URL=https://api.seudominio.com
PUBLIC_SITE_URL=https://seudominio.com
CORS_ORIGIN=https://seudominio.com

CLOUDFLARE_TUNNEL_TOKEN=<o token do passo 2>
ENV

chmod 600 .env
```

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
curl -s https://api.seudominio.com/api/v1/health
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
| `api.seudominio.com` não responde | túnel fora do ar | `docker compose -f docker-compose.prod.yml logs cloudflared` |
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
