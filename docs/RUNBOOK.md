# Runbook de operação

Procedimentos que precisam existir por escrito porque só são consultados sob
pressão. **Leia o de restauração antes de precisar dele.**

---

## 1. Backup do MongoDB

O volume `forma-ecommerce_forma-mongo-data` guarda pedidos, produtos,
configurações da loja e os segredos das integrações. Não há réplica: se ele
corromper e não houver dump, os pedidos acabaram.

```bash
cd /caminho/do/projeto
./scripts/backup-mongo.sh
```

Grava em `./backups/forma_AAAAMMDD_HHMMSS.archive.gz` e mantém os 14 mais
recentes. O script recusa dump vazio ou corrompido em vez de deixá-lo rodar a
rotação e derrubar um backup bom.

### Automatizar

```cron
0 3 * * * cd /caminho/do/projeto && scripts/backup-mongo.sh >> /var/log/forma-backup.log 2>&1
```

Ajuste com `BACKUP_DIR`, `KEEP`, `CONTAINER` e `DB`.

### Tirar o backup da máquina

`./backups` fica no mesmo disco do banco — não protege contra perda do disco.
Copie para fora com o que você já usar (`rclone`, `aws s3 cp`, `scp`):

```bash
aws s3 cp ./backups/forma_20260905_202353.archive.gz s3://SEU-BUCKET/forma/
```

### Limite conhecido

O mongod sobe standalone, sem replica set, então não há oplog e o dump **não
é um snapshot consistente entre coleções**: um pedido gravado no meio do dump
pode entrar em `orders` e não em `products`. Com o volume de escrita desta
loja o risco é pequeno — rode no horário mais parado. Para snapshot real seria
preciso converter o mongod para `--replSet`.

---

## 2. Restauração

**Destrutiva.** `--drop` apaga cada coleção antes de reinserir; tudo gravado
depois do dump se perde.

```bash
./scripts/restore-mongo.sh --list                              # o que existe
./scripts/restore-mongo.sh --dry-run forma_20260905_202353.archive.gz
./scripts/restore-mongo.sh forma_20260905_202353.archive.gz    # pra valer
```

O script pede confirmação digitada, salva o estado atual em
`backups/pre-restore_*.archive.gz` antes de sobrescrever, para `api` e `web`
durante a operação e sobe os dois no fim.

Depois de restaurar, confira antes de liberar:

```bash
curl -s localhost:4001/api/v1/health
curl -s -o /dev/null -w '%{http_code}\n' localhost:3222/
docker exec forma-mongo mongosh forma --quiet --eval 'print(db.orders.countDocuments())'
```

### Ensaie por trimestre

Backup nunca restaurado não é backup, é arquivo. O ensaio abaixo não toca o
banco real — restaura para um banco descartável e compara:

```bash
docker exec -i forma-mongo mongorestore --archive --gzip --quiet \
  --nsFrom='forma.*' --nsTo='forma_restore_test.*' < backups/ARQUIVO.archive.gz

docker exec forma-mongo mongosh --quiet --eval '
const a = db.getSiblingDB("forma"), b = db.getSiblingDB("forma_restore_test");
for (const c of ["products","orders","users","settings","integrations","custom_requests"]) {
  const x = a.getCollection(c).find().sort({_id:1}).toArray();
  const y = b.getCollection(c).find().sort({_id:1}).toArray();
  print(c.padEnd(17) + (JSON.stringify(x) === JSON.stringify(y) ? "idêntico" : "DIVERGIU"));
}'

docker exec forma-mongo mongosh forma_restore_test --quiet --eval 'db.dropDatabase()'
```

Último ensaio: **2026-09-05** — seis coleções idênticas documento a documento,
com os segredos das integrações preservados.

---

## 3. Armadilha: o seed não roda em volume populado

`SEED_DEMO=true` não basta. `seedProducts` sai cedo com
`countDocuments() > 0`, então mudança em `data/products.ts` e no
`seed.service.ts` **não chega** a um banco que já tem produtos.

Para aplicar, escolha um:

```bash
# a) corrigir os documentos direto
docker exec forma-mongo mongosh forma --quiet --eval 'db.products.updateOne(...)'

# b) recriar do zero — APAGA pedidos; faça backup antes
./scripts/backup-mongo.sh
docker compose down && docker volume rm forma-ecommerce_forma-mongo-data
docker compose up -d
```

---

## 4. Contrato OpenAPI

`openapi:check` precisa de um Mongo de pé: `app.init()` aguarda a conexão do
Mongoose e, sem app inicializado, o scanner não enxerga rota nenhuma.

```bash
docker compose up -d mongo
cd api && npm run openapi:generate    # depois de mudar controller ou schema
cd .. && npm run api:types:generate   # regenera os tipos da loja
```

O compose de desenvolvimento publica o Mongo em `127.0.0.1:27018` justamente
para isso.
