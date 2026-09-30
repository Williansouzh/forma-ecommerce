#!/usr/bin/env bash
#
# Dump do MongoDB da loja, com rotação local e cópia CIFRADA fora do servidor.
#
# Roda `mongodump` DENTRO do container e traz o resultado pelo stdout — não
# precisa das ferramentas do Mongo na máquina nem de volume compartilhado.
#
# Uso:
#   scripts/backup-mongo.sh
#
# Variáveis (também lidas de ./backup.env, se existir — ver BACKUP_ENV):
#   BACKUP_DIR            onde gravar          (default: ./backups)
#   KEEP                  quantos manter aqui  (default: 48)
#   CONTAINER             nome do container    (default: forma-mongo)
#   DB                    banco a salvar       (default: forma)
#
#   Cópia fora do servidor (liga quando R2_BUCKET está definido):
#   R2_ACCOUNT_ID         conta da Cloudflare
#   R2_BUCKET             bucket PRIVADO de backup — nunca o das imagens
#   R2_ACCESS_KEY_ID      token do R2 restrito a esse bucket
#   R2_SECRET_ACCESS_KEY
#   BACKUP_AGE_RECIPIENT  chave PÚBLICA do age (age1...). Obrigatória: o
#                         script se recusa a enviar dump sem cifrar.
#   BACKUP_PING_URL       opcional: URL de monitoramento (healthchecks.io e
#                         afins). Recebe um ping no sucesso e `/fail` na falha
#                         — é ela que avisa quando o backup PARA de rodar.
#
# De hora em hora, via cron:
#   0 * * * * cd /home/ubuntu/forma && ./backup-mongo.sh >> backup.log 2>&1
#
# POR QUE CIFRAR COM CHAVE PÚBLICA: o servidor guarda só a chave pública do
# age. Ele consegue cifrar, mas não decifrar — quem invadir a EC2 ou roubar o
# token do R2 leva arquivos ilegíveis. A chave privada fica com o dono da
# loja, fora do servidor. O dump tem nome, telefone e endereço de clientes
# (LGPD) e os segredos das integrações.
#
# LIMITE CONHECIDO: o mongod sobe standalone, sem replica set, então não há
# oplog e o dump NÃO é um snapshot consistente entre coleções — se um pedido
# for gravado no meio do dump, ele pode entrar em `orders` e não em
# `products`. Com o volume de escrita desta loja o risco é pequeno. Para
# snapshot real seria preciso converter o mongod para `--replSet`.

set -euo pipefail

BACKUP_ENV="${BACKUP_ENV:-./backup.env}"
if [[ -f "$BACKUP_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKUP_ENV"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP="${KEEP:-48}"
CONTAINER="${CONTAINER:-forma-mongo}"
DB="${DB:-forma}"
R2_BUCKET="${R2_BUCKET:-}"
R2_REGION="${R2_REGION:-auto}"
BACKUP_PING_URL="${BACKUP_PING_URL:-}"

die() { echo "erro: $*" >&2; exit 1; }

# Monitoramento: um backup que falha em silêncio é descoberto no dia em que
# mais se precisa dele. O ping de falha sai em qualquer saída com erro.
on_exit() {
  local status=$?
  if [[ -n "$BACKUP_PING_URL" ]]; then
    local url="$BACKUP_PING_URL"
    [[ $status -eq 0 ]] || url="${BACKUP_PING_URL%/}/fail"
    curl -fsS -m 10 --retry 3 -o /dev/null "$url" || echo "aviso: ping de monitoramento falhou" >&2
  fi
  [[ -n "${ENCRYPTED:-}" ]] && rm -f "$ENCRYPTED"
  return $status
}
trap on_exit EXIT

docker inspect -f '{{.State.Running}}' "$CONTAINER" >/dev/null 2>&1 \
  || die "container '$CONTAINER' não está de pé."

# Configuração de envio pela metade é erro, não "envia depois": um backup
# que o dono acha que está saindo da máquina e não está é o pior caso.
if [[ -n "$R2_BUCKET" ]]; then
  for var in R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY BACKUP_AGE_RECIPIENT; do
    [[ -n "${!var:-}" ]] || die "R2_BUCKET definido, mas falta $var."
  done
  [[ "$BACKUP_AGE_RECIPIENT" == age1* ]] \
    || die "BACKUP_AGE_RECIPIENT não é uma chave pública do age (age1...)."
  command -v age >/dev/null || die "age não instalado (sudo apt install age)."
fi

mkdir -p "$BACKUP_DIR"
STAMP=$(date +"%Y%m%d_%H%M%S")
NAME="forma_${STAMP}.archive.gz"
ARCHIVE="$BACKUP_DIR/$NAME"

echo "[backup] Gerando dump de '$DB' ..."
# `--quiet` porque o mongodump escreve progresso no stderr; o stdout é o dump.
docker exec "$CONTAINER" \
  mongodump --db="$DB" --archive --gzip --quiet > "$ARCHIVE"

# Arquivo vazio é falha silenciosa: sem esta checagem a rotação depois apaga
# um backup bom para dar lugar a um arquivo de zero byte.
[[ -s "$ARCHIVE" ]] || { rm -f "$ARCHIVE"; die "dump saiu vazio."; }
gzip -t "$ARCHIVE" || { rm -f "$ARCHIVE"; die "dump saiu corrompido."; }

echo "[backup] $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"

# ── Cópia fora do servidor ─────────────────────────────────────────────────
if [[ -n "$R2_BUCKET" ]]; then
  ENCRYPTED="$ARCHIVE.age"
  age -r "$BACKUP_AGE_RECIPIENT" -o "$ENCRYPTED" "$ARCHIVE"

  ENDPOINT="${R2_ENDPOINT:-https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com}"
  URL="${ENDPOINT%/}/${R2_BUCKET}/mongo/${NAME}.age"
  SIZE=$(wc -c < "$ENCRYPTED" | tr -d ' ')
  HASH=$(sha256sum "$ENCRYPTED" | cut -d' ' -f1)

  # O R2 fala S3; o curl assina a requisição (SigV4) sozinho. O hash do
  # corpo vai no cabeçalho e entra na assinatura: um byte corrompido no
  # caminho e o R2 recusa o envio em vez de guardar lixo.
  echo "[backup] Enviando $(basename "$URL") ($SIZE bytes, cifrado) ..."
  curl -fsS --retry 3 -m 300 \
    --aws-sigv4 "aws:amz:${R2_REGION}:s3" \
    --user "${R2_ACCESS_KEY_ID}:${R2_SECRET_ACCESS_KEY}" \
    -H "x-amz-content-sha256: ${HASH}" \
    -H "Content-Type: application/octet-stream" \
    -T "$ENCRYPTED" "$URL" >/dev/null \
    || die "envio ao R2 falhou."

  # Confere o que ficou lá, não só o que saiu daqui.
  EMPTY_HASH=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  REMOTE=$(curl -fsS -I -m 30 \
    --aws-sigv4 "aws:amz:${R2_REGION}:s3" \
    --user "${R2_ACCESS_KEY_ID}:${R2_SECRET_ACCESS_KEY}" \
    -H "x-amz-content-sha256: ${EMPTY_HASH}" \
    "$URL" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-length"{print $2}')
  [[ "$REMOTE" == "$SIZE" ]] \
    || die "o R2 guardou ${REMOTE:-nada} bytes, mas foram enviados $SIZE."
  echo "[backup] Conferido no R2: ${R2_BUCKET}/mongo/${NAME}.age"
else
  echo "[backup] AVISO: R2_BUCKET não definido — o backup ficou só neste servidor."
fi

# Rotação local: mantém os $KEEP mais recentes. A retenção longa é a do R2.
mapfile -t OLD < <(ls -1t "$BACKUP_DIR"/forma_*.archive.gz 2>/dev/null | tail -n "+$((KEEP + 1))")
for file in "${OLD[@]:-}"; do
  [[ -n "$file" ]] || continue
  rm -f "$file"
  echo "[backup] removido antigo: $(basename "$file")"
done

echo "[backup] Concluído em $(date '+%Y-%m-%d %H:%M:%S')."
