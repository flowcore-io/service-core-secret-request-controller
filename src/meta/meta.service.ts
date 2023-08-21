import { Injectable } from "@nestjs/common";
import { InjectLogger, LoggerService } from "@flowcore/microservice";
import { SyncInput } from "../interfaces/sync-input.interface";
import { Secret } from "kubernetes-types/core/v1";
import _ from "lodash";

@Injectable()
export class MetaService {
  constructor(
    @InjectLogger(MetaService.name)
    private readonly logger: LoggerService, // private readonly options: ModuleOptions<MetaModuleOptions>,
  ) {}

  async createSecret(input: SyncInput): Promise<{
    status: "Ready" | "NotReady";
    secret: Secret;
  }> {
    let status: "Ready" | "NotReady" = "Ready";

    const relatedSecret =
      input.related!["Secret.v1"][
        `${input.parent.spec.sourceSecret.namespace}/${input.parent.spec.sourceSecret.name}`
      ];

    const existingSecret: Secret | undefined =
      input.children["Secret.v1"][
        `${input.parent.spec.destinationSecret.namespace}/${input.parent.spec.destinationSecret.name}`
      ];

    if (!relatedSecret || !relatedSecret.data) {
      this.logger.info(`Related secret not found`, { ...input });
      throw new Error("Related secret not found");
    }

    if (!existingSecret) {
      status = "NotReady";
    }

    if (_.isEqual(existingSecret?.data, relatedSecret.data)) {
      status = "Ready";
    }

    return {
      status: status,
      secret: {
        apiVersion: "v1",
        kind: "Secret",
        metadata: {
          name: input.parent.spec.destinationSecret.name,
          namespace: input.parent.spec.destinationSecret.namespace,
        },
        type: relatedSecret.type,
        data: relatedSecret.data,
      },
    };
  }
}
