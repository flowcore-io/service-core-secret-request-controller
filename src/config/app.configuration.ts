import { z } from "zod";
import { ConfigurationSchema } from "@flowcore/microservice";

export const AppConfigurationShape = z.object({});
export type AppConfiguration = z.infer<typeof AppConfigurationShape>;

export class AppConfigurationSchema extends ConfigurationSchema {
  context = "app";
  linking = {};
  shape = AppConfigurationShape;
}
