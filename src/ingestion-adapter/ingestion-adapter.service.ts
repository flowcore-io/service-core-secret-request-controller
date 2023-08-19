import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { InjectLogger, LoggerService } from "@flowcore/microservice";
import { HttpService } from "@nestjs/axios";
import { ModuleOptions } from "@jbiskur/nestjs-async-module";
import { IngestionAdapterModuleOptions } from "./ingestion-adapter-module-options.interface";
import { typedPost } from "../utilities/typed-axios.util";
import { z } from "zod";
import { WELL_KNOWN_METADATA_TTL_ON_STORED_EVENT } from "../messages/source/well-known-metadata";

@Injectable()
export class IngestionAdapterService implements OnApplicationBootstrap {
  private dataCoreId: string | undefined;
  private adapterUrl: string | undefined;

  constructor(
    @InjectLogger(IngestionAdapterService.name)
    private readonly logger: LoggerService,
    private readonly httpClient: HttpService,
    private readonly options: ModuleOptions<IngestionAdapterModuleOptions>,
  ) {}

  async createSourceEvent<T>(
    input: {
      aggregator: string;
      eventType: string;
      payload: T;
      metadata?: { [key: string]: string };
    },
    ttl?: number,
  ): Promise<void> {
    this.logger.debug(
      `Sending source event to adapter ${input.aggregator}/${input.eventType}`,
      { payload: input.payload },
    );

    if (ttl !== null && ttl !== undefined) {
      input.metadata = {
        ...input.metadata,
        [WELL_KNOWN_METADATA_TTL_ON_STORED_EVENT]: ttl.toString(),
      };
    }

    const { status } = await typedPost(
      this.httpClient,
      `${this.adapterUrl}/ingest/${this.dataCoreId}/${input.aggregator}/${input.eventType}`,
      {
        payload: input.payload,
        ...(input.metadata && { metadata: input.metadata }),
      },
      z.any(),
    );

    if (status !== 201) {
      throw new Error(
        `Could not create source event, returned status ${status}`,
      );
    }
  }

  onApplicationBootstrap() {
    this.dataCoreId = this.options.get().dataCoreId;
    this.adapterUrl = this.options.get().adapterUrl;
  }
}
