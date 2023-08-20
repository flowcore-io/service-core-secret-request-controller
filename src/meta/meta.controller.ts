import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { InjectLogger, LoggerService } from "@flowcore/microservice";
import { MetaService } from "./meta.service";
import { SyncInput } from "../interfaces/sync-input.interface";
import { shake } from "radash";
import { Secret } from "kubernetes-types/core/v1";

@Controller()
export class MetaController {
  constructor(
    @InjectLogger(MetaController.name)
    private readonly logger: LoggerService,
    private readonly metaService: MetaService,
  ) {}

  @Post("customize")
  @HttpCode(200)
  async customize(@Body() input: SyncInput) {
    return {
      relatedResources: [
        {
          apiVersion: "v1",
          resource: "secrets",
          namespace: input.parent.spec.sourceSecret.namespace,
          name: input.parent.spec.sourceSecret.name,
        },
      ],
    };
  }

  @Post("sync")
  @HttpCode(200)
  async sync(@Body() input: SyncInput) {
    let resource = input.parent.status?.resource || "NotReady";
    let lastSynced = input.parent.status?.lastSynced || "Never";
    if (
      !input.related ||
      Object.keys(input.related["Secret.v1"]).length === 0
    ) {
      this.logger.info(`Requested secret not found, retrying in 30 seconds`);
      return shake({
        status: {
          lastSynced,
          resource: "NotReady",
        },
        children: [],
        resyncAfterSeconds: 30,
      });
    }

    this.logger.info(
      `Consolidating ${input.parent.kind} - ${input.parent.metadata.name}, Generation: ${input.parent.metadata.generation}, Observed Generation: ${input.parent.status?.observedGeneration}`,
    );

    const children: Secret[] = [];

    const secretSyncResult = await this.metaService.createSecret(input);

    if (secretSyncResult.status === "Ready") {
      resource = "Ready";
      if (lastSynced === "Never") {
        lastSynced = new Date().toISOString();
      }
      children.push(secretSyncResult.secret);
    } else {
      lastSynced = new Date().toISOString();
      children.push(secretSyncResult.secret);
    }

    return shake({
      status: {
        lastSynced,
        resource,
      },
      children,
      ...(resource !== "Ready" && { resyncAfterSeconds: 10 }),
    });
  }
}
