import "@flowcore/microservice/dist/tracer";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import {
  ConfigService,
  createSimpleLogger,
  DefaultAppConfiguration,
  LoggerModuleConfiguration,
} from "@flowcore/microservice";
import { join } from "path";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { AppConfiguration } from "./config/app.configuration";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = (await app.resolve(ConfigService)) as ConfigService<
    LoggerModuleConfiguration & DefaultAppConfiguration & AppConfiguration
  >;
  const logger = createSimpleLogger(config.schema);

  app.useLogger(logger);
  app.enableShutdownHooks();

  const port = config.schema.port;

  await app.startAllMicroservices();
  await app.listen(port, () => {
    logger.log(`Listening on port ${port}`);
  });
}

bootstrap();
