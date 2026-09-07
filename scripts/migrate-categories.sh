#!/usr/bin/env bash
#
# Migra `products.category` da taxonomia antiga para a nova.
#
#   utilidades -> decoracao       (suporte e organizador são objeto de casa,
#                                  e a família sozinha tinha uma peça)
#   geek       -> colecionaveis   ("geek" era um recorte de nicho que deixava
#                                  de fora quem compra o mesmo dino articulado
#                                  para uma criança)
#
# Além do renome, reclassifica peças específicas cuja prateleira mudou sem o
# slug ter sido aposentado — ver PRODUCT_MOVES abaixo.
#
# Roda `mongosh` DENTRO do container, como o backup-mongo.sh: não precisa das
# ferramentas do Mongo na máquina.
#
# Uso:
#   scripts/migrate-categories.sh            # simula, não grava
#   scripts/migrate-categories.sh --apply    # grava
#
# Variáveis:
#   CONTAINER   nome do container   (default: forma-mongo)
#   DB          banco a migrar      (default: forma)
#
# ORDEM DE DEPLOY: tanto faz. A API aceita as duas grafias na leitura e recusa
# as antigas na escrita (ver ALL_CATEGORY_SLUGS em product.schema.ts), e a loja
# dobra o slug antigo no novo ao contar (ver canonicalCategory em
# data/categories.ts). A loja fica correta antes e depois deste script.
#
# FAÇA O BACKUP ANTES: npm run db:backup

set -euo pipefail

CONTAINER="${CONTAINER:-forma-mongo}"
DB="${DB:-forma}"
APPLY=false

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=true ;;
    -h|--help) sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "erro: argumento desconhecido '$arg'" >&2; exit 1 ;;
  esac
done

die() { echo "erro: $*" >&2; exit 1; }

docker inspect -f '{{.State.Running}}' "$CONTAINER" >/dev/null 2>&1 \
  || die "container '$CONTAINER' não está de pé."

if [[ "$APPLY" == "true" ]]; then
  echo "[migração] Gravando em '$DB' ..."
else
  echo "[migração] Simulação — nada será gravado. Use --apply para valer."
fi

# O heredoc é quotado para o shell não tocar em '$set' e '$ne'; a única coisa
# que vem de fora é a flag, injetada na linha anterior ao script.
{
  echo "const APPLY = ${APPLY};"
  cat <<'JS'
const MOVES = { utilidades: "decoracao", geek: "colecionaveis" };

// Reclassificações peça a peça: não são renome de slug, são mudança de
// prateleira. "Mini Dinos" estava em `presentes`, que segue sendo uma
// categoria viva — o que mudou é o entendimento de que um kit com seis dinos
// é brinquedo, não lembrancinha. Sem esta lista o banco discordaria de
// data/products.ts depois da migração.
const PRODUCT_MOVES = { "dinos-mesa": "colecionaveis" };

const products = db.getCollection("products");
let total = 0;

// 1. Peças individuais primeiro: se fossem depois do renome em massa, uma
//    peça movida para um slug aposentado seria movida duas vezes.
for (const [slug, to] of Object.entries(PRODUCT_MOVES)) {
  const doc = products.findOne({ slug, category: { $ne: to } }, { slug: 1, category: 1 });
  if (!doc) {
    print(`· products/${slug}: já está em "${to}"`);
    continue;
  }
  total += 1;
  if (!APPLY) {
    print(`→ products/${slug}: "${doc.category}" → "${to}"`);
    continue;
  }
  products.updateOne({ slug }, { $set: { category: to } });
  print(`✓ products/${slug}: "${doc.category}" → "${to}"`);
}

// 2. Renome dos slugs aposentados.
for (const [from, to] of Object.entries(MOVES)) {
  const count = products.countDocuments({ category: from });
  total += count;

  if (count === 0) {
    print(`· category "${from}": nenhum documento`);
    continue;
  }

  if (!APPLY) {
    const nomes = products
      .find({ category: from }, { slug: 1 })
      .limit(5)
      .toArray()
      .map((doc) => doc.slug)
      .join(", ");
    print(`→ category "${from}" → "${to}": ${count} doc(s)  (${nomes}${count > 5 ? ", …" : ""})`);
    continue;
  }

  const result = products.updateMany({ category: from }, { $set: { category: to } });
  print(`✓ category "${from}" → "${to}": ${result.modifiedCount} doc(s)`);
}

print("");
if (total === 0) {
  print("Nada a migrar — o banco já está na taxonomia nova.");
} else if (!APPLY) {
  print(`${total} documento(s) seriam alterados. Rode com --apply para gravar.`);
} else {
  print(`${total} documento(s) migrados.`);
}

// Conferência: nenhum slug aposentado pode sobrar depois de gravar.
if (APPLY) {
  const restante = products.countDocuments({ category: { $in: Object.keys(MOVES) } });
  if (restante > 0) {
    print(`ATENÇÃO: ainda restam ${restante} documento(s) em slug aposentado.`);
    quit(1);
  }
  print("Conferido: nenhum slug aposentado restante.");
}
JS
} | docker exec -i "$CONTAINER" mongosh --quiet "$DB" --file /dev/stdin
# `--file /dev/stdin` e não stdin puro: lido como REPL, o mongosh ecoa o
# prompt e um "|" por linha do script, e a saída fica ilegível justamente na
# hora de conferir o que a migração alterou.

echo "[migração] Concluído em $(date '+%Y-%m-%d %H:%M:%S')."
