#!/usr/bin/env bash
#
# Restauração do MongoDB a partir de um arquivo do backup-mongo.sh.
#
# LEIA E TESTE ANTES DE PRECISAR. Backup nunca restaurado não é backup, é
# arquivo. Rode `--dry-run` pelo menos uma vez por trimestre.
#
# Uso:
#   scripts/restore-mongo.sh --list
#   scripts/restore-mongo.sh --dry-run forma_20260905_202353.archive.gz
#   scripts/restore-mongo.sh forma_20260905_202353.archive.gz
#
# Variáveis:
#   BACKUP_DIR   onde procurar      (default: ./backups)
#   CONTAINER    container do mongo (default: forma-mongo)
#   DB           banco de destino   (default: forma)

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER="${CONTAINER:-forma-mongo}"
DB="${DB:-forma}"
DRY_RUN=0
ACTION=""
ARCHIVE=""

die() { echo "erro: $*" >&2; exit 1; }
usage() { sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --list)    ACTION=list; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage 0 ;;
    -*)        die "opção desconhecida: $1" ;;
    *)         ARCHIVE="$1"; shift ;;
  esac
done

if [[ "$ACTION" == "list" ]]; then
  echo "Backups em $BACKUP_DIR (mais recentes primeiro):"
  ls -lht "$BACKUP_DIR"/forma_*.archive.gz 2>/dev/null || echo "  (nenhum)"
  exit 0
fi

[[ -n "$ARCHIVE" ]] || usage 1
# Aceita tanto o nome quanto o caminho completo.
[[ -f "$ARCHIVE" ]] || ARCHIVE="$BACKUP_DIR/$ARCHIVE"
[[ -f "$ARCHIVE" ]] || die "arquivo não encontrado: $ARCHIVE"

gzip -t "$ARCHIVE" || die "arquivo corrompido: $ARCHIVE"
echo "[restore] gzip íntegro: $(basename "$ARCHIVE") ($(du -h "$ARCHIVE" | cut -f1))"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[restore] DRY RUN — lê o índice do dump, não escreve nada."
  docker exec -i "$CONTAINER" \
    mongorestore --archive --gzip --dryRun -v < "$ARCHIVE" 2>&1 | tail -20
  echo "[restore] Dry run concluído — o banco não foi tocado."
  exit 0
fi

cat <<AVISO

  ┌──────────────────────────────────────────────────────────────┐
  │  ATENÇÃO: restauração DESTRUTIVA                             │
  │                                                              │
  │  --drop apaga cada coleção antes de reinserir. Tudo que foi  │
  │  gravado DEPOIS deste dump se perde — pedidos inclusive.     │
  └──────────────────────────────────────────────────────────────┘

  Arquivo: $(basename "$ARCHIVE")
  Banco:   $DB
AVISO
read -r -p '  Digite "restaurar" para continuar: ' confirm
[[ "$confirm" == "restaurar" ]] || die "cancelado."

# Dump do estado atual antes de sobrescrever. Se a restauração for a errada,
# este arquivo é o caminho de volta.
PRE="$BACKUP_DIR/pre-restore_$(date +%Y%m%d_%H%M%S).archive.gz"
echo "[restore] Salvando o estado ATUAL em $PRE ..."
docker exec "$CONTAINER" mongodump --db="$DB" --archive --gzip --quiet > "$PRE"
[[ -s "$PRE" ]] || die "não consegui salvar o estado atual — abortado."

# A API para durante a restauração: escrita concorrente durante um --drop
# deixa o banco num estado misto entre o dump e o tráfego novo.
echo "[restore] Parando api e web ..."
docker compose stop api web >/dev/null

echo "[restore] Restaurando ..."
docker exec -i "$CONTAINER" \
  mongorestore --archive --gzip --drop --quiet < "$ARCHIVE"

echo "[restore] Subindo api e web ..."
docker compose up -d api web >/dev/null

echo "[restore] Concluído. Confira /api/v1/health e uma tela real antes de liberar."
