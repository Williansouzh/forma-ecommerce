import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import type { ApiConfig } from "./config/configuration";

async function bootstrap() {
  // `rawBody` é o que permite conferir a assinatura do push da Shopee sobre
  // os bytes EXATOS que chegaram. Sem isto sobraria re-serializar o objeto já
  // parseado, que reordena chaves e faz o HMAC falhar sem explicação.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  /**
   * Upload de imagem chega como binário cru, e o limite padrão do Express é
   * 100 kB — qualquer foto de produto seria recusada com 413 antes de o
   * controller existir. O parser `raw` cobre só os tipos de imagem e o
   * octet-stream; o `json` fica com o limite padrão, porque nenhum payload
   * desta API é grande e afrouxar isso seria abrir superfície de graça.
   */
  app.useBodyParser("raw", {
    limit: "10mb",
    type: ["image/*", "application/octet-stream"],
  });
  const config = app.get(ConfigService<ApiConfig>);

  app.setGlobalPrefix("api/v1");

  /*
   * Um salto de confiança: a API fica atrás do Caddy (ver `Caddyfile`), então
   * sem isto todo request chega com o IP do proxy.
   *
   * Isso importa desde que o login passou a ter limite por IP: com todo mundo
   * compartilhando o IP do Caddy, cinco tentativas erradas de qualquer pessoa
   * trancariam o painel para TODOS. `1` confia só no salto mais próximo — não
   * na cadeia inteira de `X-Forwarded-For`, que o cliente pode inventar.
   */
  app.set("trust proxy", 1);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string>("corsOrigin")?.split(","),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = config.get<number>("port") ?? 4000;
  await app.listen(port);
  Logger.log(`API c3dcriativ no ar em http://localhost:${port}/api/v1`, "Bootstrap");
}

void bootstrap();
