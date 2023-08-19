import { Injectable } from "@nestjs/common";
import { InjectLogger, LoggerService } from "@flowcore/microservice";
import { ModuleOptions } from "@jbiskur/nestjs-async-module";
import { MetaModuleOptions } from "./meta-module-options.interface";

@Injectable()
export class EventSourceService {
  constructor(
    @InjectLogger(EventSourceService.name)
    private readonly logger: LoggerService,
    private readonly options: ModuleOptions<MetaModuleOptions>,
  ) {}

  public static GetSecretName() {
    return "event-source-credentials";
  }

  createService() {
    return {
      apiVersion: "v1",
      kind: "Service",
      metadata: {
        name: "source-event-source",
      },
      spec: {
        selector: {
          app: "source-event-source",
        },
        ports: [
          {
            name: "http",
            protocol: "TCP",
            port: 3000,
            targetPort: 3000,
          },
          {
            name: "grpc",
            protocol: "TCP",
            port: 5000,
            targetPort: 5000,
          },
        ],
      },
    };
  }

  createEventSource(input: {
    tag?: string;
    replicas?: number;
    organizationId: string;
    keyspace: string;
    logLevel?: string;
  }) {
    const { tag, replicas, organizationId, keyspace, logLevel } = Object.assign(
      {
        tag: this.options.get().eventSource.defaultTag,
        replicas: 1,
        logLevel: "info",
      },
      input,
    );

    return {
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: {
        name: "source-event-source",
        labels: {
          app: "source-event-source",
          "app.kubernetes.io/name": "source-event-source",
          "app.kubernetes.io/version": tag,
          "app.kubernetes.io/component": "service",
          "app.kubernetes.io/part-of": "flowcore",
          "flowcore.io/organization": organizationId,
        },
      },
      spec: {
        replicas: replicas,
        strategy: {
          type: "RollingUpdate",
          rollingUpdate: {
            maxUnavailable: 0,
            maxSurge: Math.ceil(Math.min(1, replicas * 0.25)),
          },
        },
        selector: {
          matchLabels: {
            app: "source-event-source",
          },
        },
        template: {
          metadata: {
            labels: {
              app: "source-event-source",
              "app.kubernetes.io/name": "source-event-source",
              "app.kubernetes.io/version": tag,
              "app.kubernetes.io/component": "service",
              "app.kubernetes.io/part-of": "flowcore",
              "flowcore.io/organization": organizationId,
            },
          },
          spec: {
            containers: [
              {
                name: "source-event-source",
                image: `${this.options.get().eventSource.image}:${tag}`,
                env: [
                  {
                    name: "CASSANDRA_CONTACT_POINTS",
                    value: this.options.get().cassandra.contactPoints.join(","),
                  },
                  {
                    name: "CASSANDRA_KEYSPACE",
                    value: keyspace,
                  },
                  {
                    name: "CASSANDRA_PASSWORD",
                    valueFrom: {
                      secretKeyRef: {
                        key: "cassandra-password",
                        name: EventSourceService.GetSecretName(),
                      },
                    },
                  },
                  {
                    name: "CASSANDRA_USERNAME",
                    valueFrom: {
                      secretKeyRef: {
                        key: "cassandra-username",
                        name: EventSourceService.GetSecretName(),
                      },
                    },
                  },
                  {
                    name: "GRPC_URL",
                    value: "0.0.0.0:5000",
                  },
                  {
                    name: "OIDC_WELLKNOWN_URL",
                    value: this.options.get().oidcWellKnownUrl,
                  },
                  {
                    name: "LOG_LEVEL",
                    value: logLevel,
                  },
                  ...(this.options.get().eventSource.extraEnvs
                    ? [
                        ...this.options.get().eventSource.extraEnvs.map((e) => {
                          const kv = e.split("=");
                          return {
                            name: kv[0],
                            value: kv[1],
                          };
                        }),
                      ]
                    : []),
                ],
                ports: [
                  {
                    name: "http",
                    containerPort: 3000,
                  },
                  {
                    name: "grpc",
                    containerPort: 5000,
                  },
                ],
                livenessProbe: {
                  httpGet: {
                    path: "/health",
                    port: 3000,
                  },
                  initialDelaySeconds: 10,
                  timeoutSeconds: 1,
                  failureThreshold: 10,
                },
                readinessProbe: {
                  httpGet: {
                    path: "/health",
                    port: 3000,
                  },
                  initialDelaySeconds: 10,
                  timeoutSeconds: 1,
                  failureThreshold: 10,
                },
              },
            ],
          },
        },
      },
    };
  }
}
