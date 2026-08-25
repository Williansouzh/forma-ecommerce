import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import type { ApiConfig } from "./config/configuration";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  Logger.log(`API FORMA no ar em http://localhost:${port}/api/v1`, "Bootstrap");
}

void bootstrap();
