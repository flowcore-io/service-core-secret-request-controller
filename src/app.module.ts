import { Module } from "@nestjs/common";
import { AppConfigurationSchema } from "./config/app.configuration";
import {
  ConfigFactory,
  ConfigModule,
  HealthModuleBuilder,
  LoggerModuleBuilder,
  LoggerModuleConfigurationSchema,
  MetricsModuleBuilder,
  ObservabilityModule,
} from "@flowcore/microservice";
import { HealthController } from "./health.controller";
import { MetricsController } from "./metrics.controller";
import { MetaModule } from "./meta/meta.module";

const config = ConfigModule.forRoot(
  new ConfigFactory()
    .withSchema(AppConfigurationSchema)
    .withSchema(LoggerModuleConfigurationSchema),
);

@Module({
  imports: [
    config,
    new LoggerModuleBuilder().withConfig(config).build(),
    new MetricsModuleBuilder().usingController(MetricsController).build(),
    new HealthModuleBuilder().usingController(HealthController).build(),
    ObservabilityModule,
    MetaModule.registerAsync({
      imports: [config],
      inject: [],
      useFactory: () => ({}),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
