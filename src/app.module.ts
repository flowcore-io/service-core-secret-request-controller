import { Module } from "@nestjs/common";
import {
  AppConfiguration,
  AppConfigurationSchema,
} from "./config/app.configuration";
import {
  ConfigFactory,
  ConfigModule,
  ConfigService,
  HealthModuleBuilder,
  LoggerModuleBuilder,
  LoggerModuleConfigurationSchema,
  MetricsModuleBuilder,
  ObservabilityModule,
} from "@flowcore/microservice";
import { HealthController } from "./health.controller";
import { MetricsController } from "./metrics.controller";
import {IngestionAdapterService} from "./ingestion-adapter/ingestion-adapter.service";
import {IngestionAdapterModule} from "./ingestion-adapter/ingestion-adapter.module";
import {MetaModule} from "./meta/meta.module";

const config = ConfigModule.forRoot(
  new ConfigFactory()
    .withSchema(AppConfigurationSchema)
    .withSchema(LoggerModuleConfigurationSchema)
);

const ingestionAdapter = IngestionAdapterModule.registerAsync({
  imports: [config],
  inject: [ConfigService],
  useFactory: (configService: ConfigService<AppConfiguration>) => ({
    adapterUrl: configService.schema.flowcore.adapterUrl,
    dataCoreId: configService.schema.flowcore.dataCoreId,
  }),
});

@Module({
  imports: [
    config,
    new LoggerModuleBuilder().withConfig(config).build(),
    new MetricsModuleBuilder().usingController(MetricsController).build(),
    new HealthModuleBuilder().usingController(HealthController).build(),
    ObservabilityModule,
    ingestionAdapter,
    MetaModule.registerAsync({
      imports: [config, ingestionAdapter],
      inject: [ConfigService, IngestionAdapterService],
      useFactory: (
        configService: ConfigService<
          AppConfiguration
        >,
        ingestionAdapter: IngestionAdapterService,
      ) => ({
        ingestionAdapter,
        natsServers: configService.schema.nats.servers,
      }),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
