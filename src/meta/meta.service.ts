import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { InjectLogger, LoggerService } from "@flowcore/microservice";
import { IngestionAdapterService } from "../ingestion-adapter/ingestion-adapter.service";
import { ModuleOptions } from "@jbiskur/nestjs-async-module";
import { MetaModuleOptions } from "./meta-module-options.interface";
import { EventSourceService } from "./event-source.service";
import { generate } from "generate-password";
import { Secret } from "kubernetes-types/core/v1";
import * as _ from "lodash";
import {
  WELL_KNOWN_METADATA_IS_DERIVED_EVENT,
  WELL_KNOWN_METADATA_NOTIFY_ON_STORED_EVENT,
} from "../messages/source/well-known-metadata";
import { FLOWCORE_ENUM_ORGANIZATION_EVENT_SOURCE_STATE } from "../messages/organization/flowcore-mapped-enums";
import { SyncInput } from "../interfaces/sync-input.interface";

@Injectable()
export class MetaService implements OnApplicationBootstrap {
  private ingestionService: IngestionAdapterService | undefined;

  constructor(
    @InjectLogger(MetaService.name)
    private readonly logger: LoggerService,
    private readonly options: ModuleOptions<MetaModuleOptions>,
  ) {}

  onApplicationBootstrap() {
    this.ingestionService = this.options.get().ingestionAdapter;

    if (!this.ingestionService) {
      throw new Error("Ingestion service is not defined");
    }
  }

  // async updateState(input: {
  //   organizationId: string;
  //   eventSourceName: string;
  //   keyspace: string;
  //   state: FLOWCORE_ENUM_ORGANIZATION_EVENT_SOURCE_STATE;
  //   ingestionVersion?: string;
  //   eventSourceVersion?: string;
  // }) {
  //   const {
  //     organizationId,
  //     eventSourceName,
  //     keyspace,
  //     state,
  //     ingestionVersion,
  //     eventSourceVersion,
  //   } = input;
  //   await this.ingestionService?.createSourceEvent<SourcedEventOrganizationEventSourceStateUpdated>(
  //     {
  //       eventType: SOURCE_EVENT_ORGANIZATION_EVENT_SOURCE_STATE_UPDATED,
  //       aggregator: SOURCE_AGGREGATOR_ORGANIZATION,
  //       metadata: {
  //         [WELL_KNOWN_METADATA_NOTIFY_ON_STORED_EVENT]: "true",
  //         [WELL_KNOWN_METADATA_IS_DERIVED_EVENT]: "true",
  //       },
  //       payload: {
  //         organizationId,
  //         eventSourceName,
  //         keyspace,
  //         state,
  //         ingestionVersion:
  //           ingestionVersion || this.options.get().ingestionChannel.defaultTag,
  //         eventSourceVersion:
  //           eventSourceVersion || this.options.get().eventSource.defaultTag,
  //       },
  //     },
  //   );
  // }
}
