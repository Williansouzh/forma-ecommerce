import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { Counter, CounterDocument } from "./counter.schema";
import { isDuplicateKey } from "../inventory/inventory.service";

/**
 * Numeração legível (C3D-4821, SHP-1002, ORC-117) sem corrida.
 *
 * Antes cada serviço lia o maior código gravado e somava um. Duas coisas
 * davam errado:
 *
 *   - leitura e gravação separadas: dois checkouts no mesmo instante pegavam
 *     o mesmo número, e um deles batia no índice único e virava 500;
 *   - `sort({ code: -1 })` compara TEXTO: "C3D-9999" > "C3D-10000". Depois do
 *     pedido 10000 o maior lido continuava 9999, o próximo seria 10000 de
 *     novo — e todo checkout falharia dali em diante, para sempre.
 *
 * Aqui o número sai de um `$inc` atômico num documento por sequência.
 */
@Injectable()
export class SequenceService {
  constructor(
    @InjectModel(Counter.name)
    private readonly counterModel: Model<CounterDocument>,
  ) {}

  /**
   * O próximo número de `name`.
   *
   * `seed` roda só enquanto o contador não existe — na primeira chamada numa
   * base que já tem pedidos — e devolve o maior número já usado. O `$max`
   * garante que duas primeiras chamadas simultâneas não façam o contador
   * andar para trás; a segunda criação bate no `_id` e é ignorada.
   */
  async next(name: string, seed: () => Promise<number>): Promise<number> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const bumped = await this.counterModel
        .findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true })
        .lean<Counter | null>();
      if (bumped) return bumped.seq;

      const floor = await seed();
      try {
        await this.counterModel
          .updateOne({ _id: name }, { $max: { seq: floor } }, { upsert: true })
          .exec();
      } catch (error) {
        if (!isDuplicateKey(error)) throw error;
      }
    }
    throw new Error(`Não foi possível avançar a sequência ${name}.`);
  }
}

/**
 * O maior número já usado com `prefix` numa coleção de códigos — comparado
 * como NÚMERO, não como texto. É a semente de uma sequência nova.
 */
export async function highestCodeNumber(
  model: Model<never>,
  prefix: string,
): Promise<number> {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const [row] = await model.aggregate<{ max: number | null }>([
    { $match: { code: { $regex: `^${escaped}\\d+$` } } },
    {
      $group: {
        _id: null,
        max: { $max: { $toLong: { $substrCP: ["$code", prefix.length, 30] } } },
      },
    },
  ]);
  return row?.max != null ? Number(row.max) : 0;
}
