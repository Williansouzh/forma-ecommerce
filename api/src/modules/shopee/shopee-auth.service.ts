import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { IntegrationsService } from "../integrations/integrations.service";
import {
  ShopeeApiClient,
  SHOPEE_HOSTS,
  type ShopeeCredentials,
  type ShopeeRegionKey,
  type ShopeeShopAuth,
} from "./shopee-api.client";
import {
  PUSH_SIGNATURE_SCHEMES,
  type PushSignatureScheme,
} from "./shopee-signature";

/** O que o painel pode ver da conexão. Sem token, nem pedaço dele. */
export interface ShopeeConnectionView {
  connected: boolean;
  enabled: boolean;
  shopId: string | null;
  region: ShopeeRegionKey;
  /** Quando o access token expira. Nulo quando não há token. */
  tokenExpiresAt: string | null;
  /** Negativo significa vencido. */
  tokenExpiresInSeconds: number | null;
  hasPartnerKey: boolean;
  hasRefreshToken: boolean;
  pushSignatureScheme: PushSignatureScheme;
  autoSync: boolean;
  defaultSafetyMargin: number;
  lastHealthySyncAt: string | null;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expire_in?: number;
  error?: string;
  message?: string;
}

/**
 * A Shopee dá 4 horas de validade ao access token. Renovamos com folga: um
 * token que vence no meio de uma chamada custa uma retentativa inteira.
 */
const REFRESH_SKEW_MS = 10 * 60_000;

/**
 * Guarda e renova as credenciais da loja.
 *
 * Os segredos ficam no cofre que o projeto já tem (`Integration.secrets`, com
 * `select: false`), pelo mesmo motivo do Mercado Pago: o painel nunca precisa
 * ler um token para funcionar, então ele nunca recebe um.
 */
@Injectable()
export class ShopeeAuthService {
  private readonly logger = new Logger(ShopeeAuthService.name);

  /**
   * Evita a corrida de renovação: cinco jobs percebendo o token vencido ao
   * mesmo tempo dispariam cinco refreshes, e a Shopee invalida o refresh
   * token usado — quatro deles voltariam com erro e derrubariam a conexão.
   * Todos esperam a mesma promessa.
   */
  private refreshInFlight: Promise<ShopeeShopAuth> | null = null;

  constructor(
    private readonly integrations: IntegrationsService,
    private readonly api: ShopeeApiClient,
  ) {}

  // ── Configuração ───────────────────────────────────────────────────────

  async credentials(): Promise<ShopeeCredentials> {
    const [config, secrets] = await Promise.all([
      this.integrations.configFor("shopee"),
      this.integrations.secretsFor("shopee"),
    ]);

    const partnerId = String(config.partnerId ?? "").trim();
    const partnerKey = secrets.partnerKey?.trim();
    if (!partnerId || !partnerKey) {
      throw new BadRequestException(
        "Shopee sem partner_id ou partner_key gravados. Configure em Integrações.",
      );
    }
    return { partnerId, partnerKey, region: this.regionOf(config) };
  }

  async pushSignatureScheme(): Promise<PushSignatureScheme> {
    const config = await this.integrations.configFor("shopee");
    const value = String(config.pushSignatureScheme ?? "authorization");
    return (PUSH_SIGNATURE_SCHEMES as readonly string[]).includes(value)
      ? (value as PushSignatureScheme)
      : "authorization";
  }

  /** A partner_key também assina o push que a Shopee manda para cá. */
  async partnerKey(): Promise<string | undefined> {
    return (await this.integrations.secretsFor("shopee")).partnerKey?.trim();
  }

  async isEnabled(): Promise<boolean> {
    return this.integrations.isEnabled("shopee");
  }

  /** Sincronização automática pode ser desligada sem desconectar a loja. */
  async isAutoSyncEnabled(): Promise<boolean> {
    const config = await this.integrations.configFor("shopee");
    return config.autoSync !== false;
  }

  async defaultSafetyMargin(): Promise<number> {
    const config = await this.integrations.configFor("shopee");
    const raw = Number(config.defaultSafetyMargin ?? 0);
    return Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : 0;
  }

  async shopId(): Promise<string | null> {
    const config = await this.integrations.configFor("shopee");
    const value = String(config.shopId ?? "").trim();
    return value || null;
  }

  // ── Autorização da loja ────────────────────────────────────────────────

  /** Para onde mandar o lojista para autorizar. */
  async authorizationUrl(redirectUri: string): Promise<string> {
    return this.api.buildAuthorizationUrl(await this.credentials(), redirectUri);
  }

  /**
   * Troca o `code` do retorno da autorização pelo par de tokens.
   *
   * O `code` vale uma vez só e por poucos minutos — se esta chamada falhar, o
   * caminho é refazer a autorização, não repetir com o mesmo código.
   */
  async exchangeCode(code: string, shopId: string): Promise<ShopeeConnectionView> {
    const credentials = await this.credentials();
    const token = await this.api.call<TokenResponse>(
      credentials,
      "/auth/token/get",
      {
        method: "POST",
        body: { code, shop_id: Number(shopId), partner_id: Number(credentials.partnerId) },
      },
    );

    if (!token.access_token || !token.refresh_token) {
      throw new BadRequestException(
        "A Shopee não devolveu o par de tokens para este código.",
      );
    }

    await this.persistTokens(shopId, token);
    this.logger.log(`Loja ${shopId} conectada à Shopee.`);
    return this.connection();
  }

  /**
   * Devolve um token válido, renovando quando falta pouco para vencer.
   *
   * Toda chamada de escopo de loja passa por aqui, e é por isso que o token
   * expirado nunca chega a virar erro: a renovação acontece ANTES.
   */
  async shopAuth(): Promise<ShopeeShopAuth> {
    const [config, secrets] = await Promise.all([
      this.integrations.configFor("shopee"),
      this.integrations.secretsFor("shopee"),
    ]);

    const shopId = String(config.shopId ?? "").trim();
    const accessToken = secrets.accessToken?.trim();
    if (!shopId || !accessToken) {
      throw new BadRequestException(
        "Nenhuma loja Shopee conectada. Autorize a loja em Integrações.",
      );
    }

    const expiresAt = Number(config.tokenExpiresAt ?? 0);
    if (expiresAt && expiresAt - REFRESH_SKEW_MS > Date.now()) {
      return { shopId, accessToken };
    }
    return this.refresh();
  }

  /**
   * Renova o access token com o refresh token.
   *
   * Chamadas simultâneas compartilham uma única renovação — ver
   * `refreshInFlight`.
   */
  async refresh(): Promise<ShopeeShopAuth> {
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = this.doRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private async doRefresh(): Promise<ShopeeShopAuth> {
    const [credentials, config, secrets] = await Promise.all([
      this.credentials(),
      this.integrations.configFor("shopee"),
      this.integrations.secretsFor("shopee"),
    ]);

    const shopId = String(config.shopId ?? "").trim();
    const refreshToken = secrets.refreshToken?.trim();
    if (!shopId || !refreshToken) {
      throw new BadRequestException(
        "Sem refresh token gravado: a loja precisa ser autorizada de novo.",
      );
    }

    const token = await this.api.call<TokenResponse>(
      credentials,
      "/auth/access_token/get",
      {
        method: "POST",
        body: {
          refresh_token: refreshToken,
          shop_id: Number(shopId),
          partner_id: Number(credentials.partnerId),
        },
      },
    );

    if (!token.access_token || !token.refresh_token) {
      throw new BadRequestException(
        "A Shopee recusou a renovação do token. Autorize a loja novamente.",
      );
    }

    await this.persistTokens(shopId, token);
    this.logger.log(`Token da loja ${shopId} renovado.`);
    return { shopId, accessToken: token.access_token };
  }

  /**
   * Desconecta a loja: apaga os tokens do cofre e desliga a integração.
   *
   * As associações de produto NÃO são apagadas — reconectar a mesma loja
   * depois de um susto não pode custar o trabalho de reassociar tudo.
   */
  async disconnect(): Promise<ShopeeConnectionView> {
    await this.integrations.update("shopee", {
      enabled: false,
      config: { shopId: "", tokenExpiresAt: 0 },
      removeSecrets: ["accessToken", "refreshToken"],
    });
    this.logger.warn("Loja Shopee desconectada; tokens apagados do cofre.");
    return this.connection();
  }

  /** O estado da conexão, no formato que o painel mostra. */
  async connection(): Promise<ShopeeConnectionView> {
    const [config, secrets, enabled] = await Promise.all([
      this.integrations.configFor("shopee"),
      this.integrations.secretsFor("shopee"),
      this.integrations.isEnabled("shopee"),
    ]);

    const expiresAt = Number(config.tokenExpiresAt ?? 0);
    const shopId = String(config.shopId ?? "").trim() || null;
    const lastHealthy = Number(config.lastHealthySyncAt ?? 0);

    return {
      connected: Boolean(shopId && secrets.accessToken),
      enabled,
      shopId,
      region: this.regionOf(config),
      tokenExpiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      tokenExpiresInSeconds: expiresAt
        ? Math.round((expiresAt - Date.now()) / 1000)
        : null,
      hasPartnerKey: Boolean(secrets.partnerKey),
      hasRefreshToken: Boolean(secrets.refreshToken),
      pushSignatureScheme: await this.pushSignatureScheme(),
      autoSync: config.autoSync !== false,
      defaultSafetyMargin: await this.defaultSafetyMargin(),
      lastHealthySyncAt: lastHealthy ? new Date(lastHealthy).toISOString() : null,
    };
  }

  /** Carimba o último ciclo de sincronização que terminou sem erro. */
  async markHealthySync(): Promise<void> {
    await this.integrations.update("shopee", {
      config: { lastHealthySyncAt: Date.now() },
    });
  }

  private async persistTokens(shopId: string, token: TokenResponse): Promise<void> {
    await this.integrations.update("shopee", {
      config: {
        shopId,
        // Guardamos o INSTANTE de expiração, não a duração: duração exige
        // saber quando foi emitida, e esse "quando" se perde no restart.
        tokenExpiresAt: Date.now() + (token.expire_in ?? 4 * 3600) * 1000,
      },
      secrets: {
        accessToken: token.access_token!,
        refreshToken: token.refresh_token!,
      },
    });
  }

  private regionOf(config: Record<string, unknown>): ShopeeRegionKey {
    const value = String(config.region ?? "BR");
    return value in SHOPEE_HOSTS ? (value as ShopeeRegionKey) : "BR";
  }
}
