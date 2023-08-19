import { DynamicModule, Module } from "@nestjs/common";
import { IngestionAdapterService } from "./ingestion-adapter.service";
import { AsyncOptions, createAsyncModule } from "@jbiskur/nestjs-async-module";
import { IngestionAdapterModuleOptions } from "./ingestion-adapter-module-options.interface";
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [HttpModule],
  providers: [IngestionAdapterService],
  exports: [IngestionAdapterService],
})
export class IngestionAdapterModule extends createAsyncModule<IngestionAdapterModuleOptions>() {
  public static registerAsync(
    options: AsyncOptions<IngestionAdapterModuleOptions>,
  ): DynamicModule {
    return super.registerAsync(options, IngestionAdapterModule);
  }
}
