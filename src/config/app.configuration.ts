import { z } from "zod";
import { ConfigurationSchema } from "@flowcore/microservice";

export const AppConfigurationShape = z.object({
  nats: z.object({
    servers: z.string().transform((entry) => entry.split(",")),
    queue: z.string(),
  }),
  adapterUrl: z.string().url(),
  dataCoreId: z.string(),
});
export type AppConfiguration = z.infer<typeof AppConfigurationShape>;

export class AppConfigurationSchema extends ConfigurationSchema {
  context = "app";
  linking = {
    nats: {
      servers: {
        env: "NATS_SERVERS",
      },
      queue: {
        env: "NATS_QUEUE",
        default: "org-event-source-controller",
      },
    },
    adapterUrl: {
      env: "FLOWCORE_ADAPTER_URL",
      default: "http://localhost:3001",
    },
    dataCoreId: {
      env: "FLOWCORE_DATA_CORE_ID",
    },
  };
  shape = AppConfigurationShape;
}
