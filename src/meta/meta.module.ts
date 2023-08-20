import { DynamicModule, Module } from "@nestjs/common";
import { MetaService } from "./meta.service";
import { AsyncOptions, createAsyncModule } from "@jbiskur/nestjs-async-module";
import { MetaController } from "./meta.controller";

@Module({
  providers: [MetaService],
  controllers: [MetaController],
})
export class MetaModule extends createAsyncModule<unknown>() {
  public static registerAsync(options: AsyncOptions<unknown>): DynamicModule {
    return super.registerAsync(options, MetaModule);
  }
}
