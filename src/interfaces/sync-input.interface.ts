import { Secret } from "kubernetes-types/core/v1";
import { ObjectMeta } from "kubernetes-types/meta/v1";

export type SyncInput = {
  parent: {
    apiVersion: string;
    kind: string;
    metadata: ObjectMeta;
    spec: {
      sourceSecret: {
        name: string;
        namespace: string;
      };
      destinationSecret: {
        name: string;
        namespace: string;
      };
    };
    status?: {
      lastSynced?: string;
      resource?: "NotReady" | "Ready";
      observedGeneration?: number;
    };
  };
  children: {
    "Secret.v1": { [name: string]: Secret };
  };
  related?: {
    "Secret.v1": { [name: string]: Secret };
  };
};
