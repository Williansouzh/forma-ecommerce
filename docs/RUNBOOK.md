# Runbook de operação

Procedimentos que precisam existir por escrito porque só são consultados sob
pressão. **Leia o de restauração antes de precisar dele.**

---

## 1. Backup do MongoDB

O volume do Mongo guarda pedidos, produtos, configurações da loja e os
segredos das integrações. Não há réplica: se ele corromper e não houver dump,
os pedidos acabaram.

```bash
cd ~/forma          # em produção; no repositório, ./scripts/backup-mongo.sh
./backup-mongo.sh
```

Cada execução:

1. gera o dump em `./backups/forma_AAAAMMDD_HHMMSS.archive.gz` e recusa
   arquivo vazio ou corrompido antes da rotação;
2. com `backup.env` configurado, **cifra** com a chave pública do `age` e envia
   para `camada-backups/mongo/` no R2, conferindo o tamanho do que ficou lá;
3. mantém as últimas 48 cópias locais;
4. avisa o `BACKUP_PING_URL` do sucesso ou da falha.

Configuração passo a passo (bucket, bucket lock, token, chave, cron e
monitoramento): [`DEPLOY.md` § 10](DEPLOY.md#10--backup).

Sem `backup.env`, o script funciona como antes — só local — e avisa que o
backup ficou no servidor.

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

Na pasta da pilha (`~/forma` em produção):

```bash
./restore-mongo.sh --list                  # cópias neste servidor
./restore-mongo.sh --dry-run forma_20260905_202353.archive.gz
./restore-mongo.sh forma_20260905_202353.archive.gz        # pra valer
```

O script pede confirmação digitada, salva o estado atual em
`backups/pre-restore_*.archive.gz` antes de sobrescrever, para a `api`
durante a operação e a sobe no fim. Usa o `docker-compose.prod.yml` quando ele
existe na pasta.

### Do R2 — inclusive num servidor novo

Quando o servidor inteiro se perdeu: suba a pilha vazia (DEPLOY.md § 5),
recrie o `backup.env` e traga a **chave privada** do `age` só para esta
operação.

```bash
./restore-mongo.sh --list-remote                     # o que há no R2
./restore-mongo.sh --fetch forma_20260905_202353.archive.gz.age

nano ~/chave-backup.txt && chmod 600 ~/chave-backup.txt   # cole a chave privada
./restore-mongo.sh --dry-run --identity ~/chave-backup.txt forma_20260905_202353.archive.gz.age
./restore-mongo.sh --identity ~/chave-backup.txt forma_20260905_202353.archive.gz.age
shred -u ~/chave-backup.txt                               # a chave NÃO fica no servidor
```

Depois de restaurar, confira antes de liberar:

```bash
docker exec forma-api wget -qO- http://127.0.0.1:4000/api/v1/health
docker exec forma-mongo mongosh forma --quiet --eval 'print(db.orders.countDocuments())'
curl -s -o /dev/null -w '%{http_code}\n' https://studiocamada.com/
```

### Ensaie por trimestre

Backup nunca restaurado não é backup, é arquivo. O ensaio abaixo não toca o
banco real: baixa a cópia mais recente **do R2**, decifra, restaura para um
banco descartável e compara. É o caminho inteiro de um desastre de verdade,
não só o arquivo local.

```bash
ULTIMO=$(./restore-mongo.sh --list-remote | tail -1 | tr -d ' ')
./restore-mongo.sh --fetch "$ULTIMO"
age -d -i ~/chave-backup.txt "backups/$ULTIMO" \
  | docker exec -i forma-mongo mongorestore --archive --gzip --quiet \
      --nsFrom='forma.*' --nsTo='forma_restore_test.*'
shred -u ~/chave-backup.txt

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
