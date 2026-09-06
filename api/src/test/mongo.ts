import { MongooseModule } from "@nestjs/mongoose";
import type { Connection } from "mongoose";
import type { DynamicModule } from "@nestjs/common";

/**
 * Mongo de verdade para os testes de integração.
 *
 * O enunciado pede mock só no limite da API da Shopee — as regras de estoque
 * dependem de `findOneAndUpdate` condicional, `$expr` e índice único, que são
 * comportamento do BANCO. Um repositório falso passaria nesses testes e
 * quebraria em produção, que é exatamente o defeito que eles existem para
 * pegar. Então aqui roda mongod.
 *
 * O compose de desenvolvimento já publica um em 127.0.0.1:27018, e o job da
 * API no CI sobe o mesmo serviço na mesma porta.
 */
export const TEST_MONGO_URI =
  process.env.MONGODB_TEST_URI ?? "mongodb://127.0.0.1:27018";

/** Um banco por suíte, para que rodarem juntas não signifique interferirem. */
export function testMongoModule(database: string): DynamicModule {
  return MongooseModule.forRoot(`${TEST_MONGO_URI}/${database}`);
}

/**
 * A conexão vem do container do Nest, nunca de `mongoose.connection`.
 *
 * `MongooseModule.forRoot` abre a própria conexão com `createConnection`; a
 * global do pacote fica vazia. Limpar a global "funcionava" sem erro e não
 * apagava nada — a suíte herdava as reservas da execução anterior e um teste
 * passava a ver estoque que ele mesmo não criou. Recebendo a conexão como
 * parâmetro, o helper não tem como mirar no lugar errado.
 */
export async function clearCollections(connection: Connection): Promise<void> {
  await Promise.all(
    Object.values(connection.collections).map((collection) =>
      collection.deleteMany({}),
    ),
  );
}

/**
 * Os índices únicos são metade da defesa contra duplicidade e corrida. O
 * Mongoose os cria em segundo plano, então um teste rápido pode rodar ANTES
 * de o índice existir e passar por acaso.
 */
export async function ensureIndexes(connection: Connection): Promise<void> {
  await Promise.all(
    Object.values(connection.models).map((model) => model.syncIndexes()),
  );
}
