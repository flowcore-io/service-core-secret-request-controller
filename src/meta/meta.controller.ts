import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { InjectLogger, LoggerService } from "@flowcore/microservice";
import { MetaService } from "./meta.service";
import { SyncInput } from "../interfaces/sync-input.interface";
import { EventSourceService } from "./event-source.service";
import * as _ from "lodash";
import { shake } from "radash";

@Controller()
export class MetaController {
  constructor(
    @InjectLogger(MetaController.name)
    private readonly logger: LoggerService,
    private readonly metaService: MetaService,
    private readonly eventSourceService: EventSourceService,
  ) {}

  @Post("sync")
  @HttpCode(200)
  async sync(@Body() input: SyncInput) {
    this.logger.info(
      `Syncing ${input.parent.kind} - ${input.parent.metadata.name}, Generation: ${input.parent.status?.observedGeneration}`,
    );

    let deploymentReady = false;

    const resync = {
      ...(!deploymentReady && { resyncAfterSeconds: 10 }),
    };

    const obj = shake({
      status: {
        // keyspace: keyspaceReady ? "Deployed" : "NotDeployed",
        // eventSource: deploymentReady ? "Deployed" : "NotDeployed",
        // ingestionChannel: deploymentReady ? "Deployed" : "NotDeployed",
        // lastEventRecorded: deploymentReady ? "Ready" : "Added",
      },
      children: [
        this.eventSourceService.createEventSource({
          organizationId: input.parent.spec.organizationId,
          keyspace: input.parent.spec.keyspace,
          ...(input.parent.spec.eventSource?.tag && {
            tag: input.parent.spec.eventSource.tag,
          }),
          ...(input.parent.spec.eventSource?.replicas && {
            replicas: input.parent.spec.eventSource.replicas,
          }),
          ...(input.parent.spec.eventSource?.logLevel && {
            logLevel: input.parent.spec.eventSource.logLevel,
          }),
        }),
        this.eventSourceService.createService(),
      ],
      ...resync,
    });

    return obj;
  }
}
