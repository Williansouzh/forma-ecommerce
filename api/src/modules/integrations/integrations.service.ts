import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  INTEGRATION_KEYS,
  Integration,
  IntegrationDocument,
  IntegrationKey,
} from "./schemas/integration.schema";
import { UpdateIntegrationDto } from "./dto/integration.dto";

/** O que o painel recebe: sem segredo, só a dica do que está guardado. */
export interface IntegrationView {
  key: IntegrationKey;
  enabled: boolean;
  config: Record<string, unknown>;
  secretHints: Record<string, string>;
}

export interface TestResult {
  ok: boolean;
  message: string;
}

/**
 * Mostra o bastante para a pessoa reconhecer a chave sem revelá-la.
 * `APP_USR-8f3c7d…a91d`
 */
function mask(value: string): string {
  const clean = value.trim();
  if (clean.length <= 8) return "••••";
  return `${clean.slice(0, 8)}…${clean.slice(-4)}`;
}

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectModel(Integration.name)
    private readonly integrationModel: Model<IntegrationDocument>,
  ) {}

  async findAll(): Promise<IntegrationView[]> {
    const rows = await this.integrationModel
      .find()
      .select("+secrets")
      .lean<Integration[]>();
    const byKey = new Map(rows.map((row) => [row.key, row]));

    // Uma linha por integração conhecida, exista ou não no banco ainda.
    return INTEGRATION_KEYS.map((key) => {
      const row = byKey.get(key);
      return {
        key,
        enabled: row?.enabled ?? false,
        config: row?.config ?? {},
        secretHints: Object.fromEntries(
          Object.entries(row?.secrets ?? {})
            .filter(([, value]) => Boolean(value))
            .map(([name, value]) => [name, mask(value)]),
        ),
      };
    });
  }

  async update(
    key: IntegrationKey,
    dto: UpdateIntegrationDto,
  ): Promise<IntegrationView> {
    // O upsert não roda o enum do schema, então a chave é checada aqui.
    if (!INTEGRATION_KEYS.includes(key)) {
      throw new BadRequestException(`Integração desconhecida: ${key}`);
    }

    const set: Record<string, unknown> = {};
    if (dto.enabled !== undefined) set.enabled = dto.enabled;
    if (dto.config) {
      for (const [name, value] of Object.entries(dto.config)) {
        set[`config.${name}`] = value;
      }
    }
    // Campo vazio significa "não mexe no segredo", não "apaga o segredo".
    if (dto.secrets) {
      for (const [name, value] of Object.entries(dto.secrets)) {
        if (typeof value === "string" && value.trim()) {
          set[`secrets.${name}`] = value.trim();
        }
      }
    }

    const unset: Record<string, "" > = {};
    for (const name of dto.removeSecrets ?? []) {
      unset[`secrets.${name}`] = "";
    }

    await this.integrationModel
      .findOneAndUpdate(
        { key },
        {
          $set: set,
          $setOnInsert: { key },
          ...(Object.keys(unset).length ? { $unset: unset } : {}),
        },
        { upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    const all = await this.findAll();
    return all.find((item) => item.key === key)!;
  }

  /**
   * Uso interno da API — o controller nunca chama isto. É como o webhook
   * alcança o access token sem que ele passe por perto do painel.
   */
  async secretsFor(key: IntegrationKey): Promise<Record<string, string>> {
    const row = await this.integrationModel
      .findOne({ key })
      .select("+secrets")
      .lean<Integration | null>();
    return row?.secrets ?? {};
  }

  async isEnabled(key: IntegrationKey): Promise<boolean> {
    const row = await this.integrationModel
      .findOne({ key })
      .lean<Integration | null>();
    return row?.enabled ?? false;
  }

  /**
   * Testa a credencial de verdade, contra o Mercado Pago. Sem token gravado
   * não há o que testar — melhor dizer isso do que fingir um "OK".
   */
  async testMercadoPago(): Promise<TestResult> {
    const row = await this.integrationModel
      .findOne({ key: "mercadopago" })
      .select("+secrets")
      .lean<Integration | null>();
    const token = row?.secrets?.accessToken;
    if (!token) {
      throw new BadRequestException(
        "Nenhum access token gravado. Salve a credencial antes de testar.",
      );
    }

    const response = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);

    if (!response) {
      return { ok: false, message: "Não foi possível alcançar o Mercado Pago." };
    }
    if (response.status === 401) {
      return { ok: false, message: "Credencial recusada (401)." };
    }
    if (!response.ok) {
      return { ok: false, message: `Mercado Pago respondeu ${response.status}.` };
    }

    const body = (await response.json().catch(() => null)) as {
      nickname?: string;
      email?: string;
    } | null;
    const who = body?.nickname ?? body?.email ?? "conta verificada";
    return { ok: true, message: `Conexão OK · ${who}` };
  }
}
