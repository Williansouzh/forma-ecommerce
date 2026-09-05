#!/usr/bin/env bash
#
# Dump do MongoDB da loja para um arquivo local, com rotação.
#
# Roda `mongodump` DENTRO do container e traz o resultado pelo stdout — não
# precisa das ferramentas do Mongo na máquina nem de volume compartilhado.
#
# Uso:
#   scripts/backup-mongo.sh
#
# Variáveis:
#   BACKUP_DIR   onde gravar          (default: ./backups)
#   KEEP         quantos arquivos manter (default: 14)
#   CONTAINER    nome do container    (default: forma-mongo)
#   DB           banco a salvar       (default: forma)
#
# Diário às 3h, via cron:
#   0 3 * * * cd /caminho/do/projeto && scripts/backup-mongo.sh >> /var/log/forma-backup.log 2>&1
#
# LIMITE CONHECIDO: o mongod sobe standalone, sem replica set, então não há
# oplog e o dump NÃO é um snapshot consistente entre coleções — se um pedido
# for gravado no meio do dump, ele pode entrar em `orders` e não em
# `products`. Com o volume de escrita desta loja o risco é pequeno, mas rode
# o backup no horário mais parado. Para snapshot real seria preciso converter
# o mongod para `--replSet`.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP="${KEEP:-14}"
CONTAINER="${CONTAINER:-forma-mongo}"
DB="${DB:-forma}"

die() { echo "erro: $*" >&2; exit 1; }

docker inspect -f '{{.State.Running}}' "$CONTAINER" >/dev/null 2>&1 \
  || die "container '$CONTAINER' não está de pé."

mkdir -p "$BACKUP_DIR"
STAMP=$(date +"%Y%m%d_%H%M%S")
ARCHIVE="$BACKUP_DIR/forma_${STAMP}.archive.gz"

echo "[backup] Gerando dump de '$DB' ..."
# `--quiet` porque o mongodump escreve progresso no stderr; o stdout é o dump.
docker exec "$CONTAINER" \
  mongodump --db="$DB" --archive --gzip --quiet > "$ARCHIVE"

# Arquivo vazio é falha silenciosa: sem esta checagem a rotação depois apaga
# um backup bom para dar lugar a um arquivo de zero byte.
[[ -s "$ARCHIVE" ]] || { rm -f "$ARCHIVE"; die "dump saiu vazio."; }
gzip -t "$ARCHIVE" || { rm -f "$ARCHIVE"; die "dump saiu corrompido."; }

echo "[backup] $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"

# Rotação: mantém os $KEEP mais recentes.
mapfile -t OLD < <(ls -1t "$BACKUP_DIR"/forma_*.archive.gz 2>/dev/null | tail -n "+$((KEEP + 1))")
for file in "${OLD[@]:-}"; do
  [[ -n "$file" ]] || continue
  rm -f "$file"
  echo "[backup] removido antigo: $(basename "$file")"
done

echo "[backup] Concluído em $(date '+%Y-%m-%d %H:%M:%S')."
