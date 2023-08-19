import { DynamicModule, Module } from "@nestjs/common";
import { MetaService } from "./meta.service";
import { AsyncOptions, createAsyncModule } from "@jbiskur/nestjs-async-module";
import { MetaController } from "./meta.controller";
import { MetaModuleOptions } from "./meta-module-options.interface";
import { EventSourceService } from "./event-source.service";

@Module({
  providers: [MetaService, EventSourceService],
  controllers: [MetaController],
})
export class MetaModule extends createAsyncModule<MetaModuleOptions>() {
  public static registerAsync(
    options: AsyncOptions<MetaModuleOptions>,
  ): DynamicModule {
    return super.registerAsync(options, MetaModule);
  }
}
