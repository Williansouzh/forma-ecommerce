#!/usr/bin/env bash
#
# Restauração do MongoDB a partir de um arquivo do backup-mongo.sh — local ou
# baixado do R2, em claro (.archive.gz) ou cifrado (.archive.gz.age).
#
# LEIA E TESTE ANTES DE PRECISAR. Backup nunca restaurado não é backup, é
# arquivo. Rode `--dry-run` pelo menos uma vez por trimestre.
#
# Uso:
#   scripts/restore-mongo.sh --list                  # backups neste servidor
#   scripts/restore-mongo.sh --list-remote           # backups no R2
#   scripts/restore-mongo.sh --fetch forma_20260905_202353.archive.gz.age
#   scripts/restore-mongo.sh --dry-run --identity ~/chave-backup.txt ARQUIVO.age
#   scripts/restore-mongo.sh --identity ~/chave-backup.txt ARQUIVO.age
#   scripts/restore-mongo.sh forma_20260905_202353.archive.gz
#
# Variáveis (também lidas de ./backup.env, como no backup):
#   BACKUP_DIR    onde procurar e baixar  (default: ./backups)
#   CONTAINER     container do mongo      (default: forma-mongo)
#   DB            banco de destino        (default: forma)
#   COMPOSE_FILE  compose da pilha        (default: docker-compose.prod.yml,
#                                          ou docker-compose.yml se não houver)
#   R2_*          as mesmas do backup, para --list-remote e --fetch
#
# A CHAVE PRIVADA DO AGE não mora no servidor. Para restaurar um arquivo
# cifrado, traga-a só na hora (cole num arquivo com `chmod 600`) e apague
# depois — é ela que torna os backups do R2 ilegíveis para quem os roubar.

set -euo pipefail

BACKUP_ENV="${BACKUP_ENV:-./backup.env}"
if [[ -f "$BACKUP_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$BACKUP_ENV"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER="${CONTAINER:-forma-mongo}"
DB="${DB:-forma}"
R2_REGION="${R2_REGION:-auto}"
DRY_RUN=0
ACTION=""
ARCHIVE=""
IDENTITY="${AGE_IDENTITY:-}"
FETCH=""
EMPTY_HASH=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

die() { echo "erro: $*" >&2; exit 1; }
usage() { sed -n '2,29p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --list)        ACTION=list; shift ;;
    --list-remote) ACTION=list-remote; shift ;;
    --fetch)       ACTION=fetch; FETCH="${2:-}"; shift 2 || die "--fetch pede um nome" ;;
    --identity)    IDENTITY="${2:-}"; shift 2 || die "--identity pede um arquivo" ;;
    --dry-run)     DRY_RUN=1; shift ;;
    -h|--help)     usage 0 ;;
    -*)            die "opção desconhecida: $1" ;;
    *)             ARCHIVE="$1"; shift ;;
  esac
done

# ── R2 ────────────────────────────────────────────────────────────────────
r2_get() {
  for var in R2_ACCOUNT_ID R2_BUCKET R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY; do
    [[ -n "${!var:-}" ]] || die "falta $var (defina em backup.env)."
  done
  local endpoint="${R2_ENDPOINT:-https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com}"
  curl -fsS -m 300 \
    --aws-sigv4 "aws:amz:${R2_REGION}:s3" \
    --user "${R2_ACCESS_KEY_ID}:${R2_SECRET_ACCESS_KEY}" \
    -H "x-amz-content-sha256: ${EMPTY_HASH}" \
    "$@" "${endpoint%/}/${R2_BUCKET}/${R2_PATH}"
}

if [[ "$ACTION" == "list" ]]; then
  echo "Backups em $BACKUP_DIR (mais recentes primeiro):"
  ls -lht "$BACKUP_DIR"/forma_*.archive.gz* 2>/dev/null || echo "  (nenhum)"
  exit 0
fi

if [[ "$ACTION" == "list-remote" ]]; then
  echo "Backups no R2 (${R2_BUCKET:-?}/mongo/, os 1000 mais antigos primeiro):"
  R2_PATH="?list-type=2&prefix=mongo/" r2_get \
    | grep -o '<Key>[^<]*</Key>' | sed 's#<Key>mongo/##; s#</Key>##' \
    || echo "  (nenhum)"
  exit 0
fi

if [[ "$ACTION" == "fetch" ]]; then
  [[ "$FETCH" == forma_*.archive.gz.age ]] || die "nome inesperado: $FETCH (veja --list-remote)."
  mkdir -p "$BACKUP_DIR"
  R2_PATH="mongo/$FETCH" r2_get -o "$BACKUP_DIR/$FETCH" || die "não consegui baixar $FETCH."
  echo "[restore] Baixado: $BACKUP_DIR/$FETCH ($(du -h "$BACKUP_DIR/$FETCH" | cut -f1))"
  exit 0
fi

# ── Restauração ───────────────────────────────────────────────────────────
[[ -n "$ARCHIVE" ]] || usage 1
# Aceita tanto o nome quanto o caminho completo.
[[ -f "$ARCHIVE" ]] || ARCHIVE="$BACKUP_DIR/$ARCHIVE"
[[ -f "$ARCHIVE" ]] || die "arquivo não encontrado: $ARCHIVE"

PLAIN=""
cleanup() { [[ -n "$PLAIN" ]] && rm -f "$PLAIN"; return 0; }
trap cleanup EXIT

if [[ "$ARCHIVE" == *.age ]]; then
  [[ -n "$IDENTITY" ]] || die "arquivo cifrado: informe a chave privada com --identity ARQUIVO."
  [[ -f "$IDENTITY" ]] || die "chave não encontrada: $IDENTITY"
  command -v age >/dev/null || die "age não instalado (sudo apt install age)."
  PLAIN=$(mktemp "${TMPDIR:-/tmp}/restore.XXXXXX")
  chmod 600 "$PLAIN"
  age -d -i "$IDENTITY" -o "$PLAIN" "$ARCHIVE" \
    || die "não consegui decifrar — é a chave privada certa?"
  echo "[restore] Decifrado: $(basename "$ARCHIVE")"
  SOURCE="$PLAIN"
else
  SOURCE="$ARCHIVE"
fi

gzip -t "$SOURCE" || die "arquivo corrompido: $ARCHIVE"
echo "[restore] gzip íntegro: $(basename "$ARCHIVE") ($(du -h "$SOURCE" | cut -f1))"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[restore] DRY RUN — lê o índice do dump, não escreve nada."
  docker exec -i "$CONTAINER" \
    mongorestore --archive --gzip --dryRun -v < "$SOURCE" 2>&1 | tail -20
  echo "[restore] Dry run concluído — o banco não foi tocado."
  exit 0
fi

# O compose de produção não se chama `docker-compose.yml`, e lá não existe
# serviço `web` — a loja está na Cloudflare. Chamar `docker compose stop api
# web` sem `-f` fazia a restauração falhar justamente em produção, depois de
# a confirmação ter sido digitada.
if [[ -z "${COMPOSE_FILE:-}" ]]; then
  if [[ -f docker-compose.prod.yml ]]; then COMPOSE_FILE=docker-compose.prod.yml
  else COMPOSE_FILE=docker-compose.yml; fi
fi
[[ -f "$COMPOSE_FILE" ]] || die "compose não encontrado: $COMPOSE_FILE (rode na pasta da pilha)."
mapfile -t SERVICES < <(docker compose -f "$COMPOSE_FILE" config --services 2>/dev/null \
  | grep -xE 'api|web' || true)
[[ ${#SERVICES[@]} -gt 0 ]] || die "nenhum serviço api/web em $COMPOSE_FILE — confira o .env."

cat <<AVISO

  ┌──────────────────────────────────────────────────────────────┐
  │  ATENÇÃO: restauração DESTRUTIVA                             │
  │                                                              │
  │  --drop apaga cada coleção antes de reinserir. Tudo que foi  │
  │  gravado DEPOIS deste dump se perde — pedidos inclusive.     │
  └──────────────────────────────────────────────────────────────┘

  Arquivo: $(basename "$ARCHIVE")
  Banco:   $DB
  Para:    ${SERVICES[*]} ($COMPOSE_FILE)
AVISO
read -r -p '  Digite "restaurar" para continuar: ' confirm
[[ "$confirm" == "restaurar" ]] || die "cancelado."

# Dump do estado atual antes de sobrescrever. Se a restauração for a errada,
# este arquivo é o caminho de volta.
mkdir -p "$BACKUP_DIR"
PRE="$BACKUP_DIR/pre-restore_$(date +%Y%m%d_%H%M%S).archive.gz"
echo "[restore] Salvando o estado ATUAL em $PRE ..."
docker exec "$CONTAINER" mongodump --db="$DB" --archive --gzip --quiet > "$PRE"
[[ -s "$PRE" ]] || die "não consegui salvar o estado atual — abortado."

# A API para durante a restauração: escrita concorrente durante um --drop
# deixa o banco num estado misto entre o dump e o tráfego novo.
echo "[restore] Parando ${SERVICES[*]} ..."
docker compose -f "$COMPOSE_FILE" stop "${SERVICES[@]}" >/dev/null

echo "[restore] Restaurando ..."
docker exec -i "$CONTAINER" \
  mongorestore --archive --gzip --drop --quiet < "$SOURCE"

echo "[restore] Subindo ${SERVICES[*]} ..."
docker compose -f "$COMPOSE_FILE" up -d "${SERVICES[@]}" >/dev/null

echo "[restore] Concluído. Confira /api/v1/health e uma tela real antes de liberar."
