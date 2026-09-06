import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import type { ApiConfig } from "./config/configuration";

async function bootstrap() {
  // `rawBody` é o que permite conferir a assinatura do push da Shopee sobre
  // os bytes EXATOS que chegaram. Sem isto sobraria re-serializar o objeto já
  // parseado, que reordena chaves e faz o HMAC falhar sem explicação.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService<ApiConfig>);

  app.setGlobalPrefix("api/v1");
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
