import { Injectable, Module, OnApplicationBootstrap } from "@nestjs/common";
import { InjectLogger, LoggerService } from "@flowcore/microservice";
import { exec } from "shelljs";
import path from "path";
import fs from "fs";
import yaml from "js-yaml";
import _ from "lodash";
import { promisify } from "util";
import child_process from "child_process";
import { SOURCE_NAMESPACE } from "./constants";

const K8S_CONTEXT = process.env.LOCAL_K8S_CONTEXT;

const asyncExec = promisify(child_process.exec);

@Injectable()
export class K8sPrepService implements OnApplicationBootstrap {
  constructor(
    @InjectLogger(K8sPrepService.name)
    private readonly logger: LoggerService,
  ) {}

  async onApplicationBootstrap() {
    await this.assertContext();
    this.logger.info(`Cleaing up any existing secret requests`);
    const existingResources = this.shell(
      `kubectl get secretrequest -n temp-org -o jsonpath='{.items[*].metadata.name}'`,
    )
      .stdout.trim()
      .split(" ")
      .filter((x) => !_.isEmpty(x));

    for (const resource of existingResources) {
      await Promise.all([
        asyncExec(`kubectl delete secretrequest ${resource} -n temp-org`, {
          cwd: path.join(__dirname, "yaml"),
        }),
      ]);
    }

    exec("kubectl get secret -n source -o jsonpath='{.items[*].metadata.name}'")
      .stdout.split(" ")
      .forEach((secret) => {
        exec(`kubectl delete secret ${secret} -n source`);
      });

    this.logger.info("Installing Metacontroller");
    this.shell("kubectl apply -k ./metacontroller");
    this.shell("kubectl apply -f ./namespace.yaml");
    await this.createCRDandHook();
  }

  async createCRDandHook() {
    this.logger.info("Installing Secret Request Controller");
    const templateResource = fs
      .readFileSync(
        path.join(__dirname, "yaml", "custom-resource.controller.yaml"),
      )
      .toString();

    const instance = _.template(templateResource);

    const parsed = instance({
      host: process.env.HOOK_HOST,
    });

    const loadedYaml = yaml.loadAll(parsed);

    console.log(yaml.dump(loadedYaml));

    this.shell(`cat <<EOF | kubectl apply -f -
${yaml.dump(loadedYaml[0])}
EOF`);

    this.shell(`cat <<EOF | kubectl apply -f -
${yaml.dump(loadedYaml[1])}
EOF`);
  }

  async createSecretRequest(
    name: string,
    sourceName: string,
    destinationName: string,
  ) {
    this.logger.info(`Creating resource for ${name}`);
    const templateResource = fs
      .readFileSync(path.join(__dirname, "yaml", "resource.yaml"))
      .toString();

    const instance = _.template(templateResource);

    const parsed = instance({
      sourceName,
      sourceNamespace: SOURCE_NAMESPACE,
      destinationName,
      name,
    });

    const loadedYaml = yaml.load(parsed);

    console.log(yaml.dump(loadedYaml));

    this.shell(`cat <<EOF | kubectl apply -f -
${yaml.dump(loadedYaml)}
EOF`);
  }

  async createSourceSecret(sourceSecret: string, content: any) {
    this.logger.info(`Creating secret ${sourceSecret}`);

    const namespace = {
      apiVersion: "v1",
      kind: "Namespace",
      metadata: {
        name: SOURCE_NAMESPACE,
      },
    };

    this.shell(`cat <<EOF | kubectl apply -f -
${yaml.dump(namespace)}
EOF`);

    const secret = {
      apiVersion: "v1",
      kind: "Secret",
      metadata: {
        name: sourceSecret,
        namespace: SOURCE_NAMESPACE,
      },
      type: "Opaque",
      data: {
        ...content,
      },
    };

    this.shell(`cat <<EOF | kubectl apply -f -
${yaml.dump(secret)}
EOF`);
  }

  private async assertContext() {
    const context = this.shell("kubectl config current-context").stdout.trim();

    this.logger.info(
      `Validating kubectl context: ${context} == ${K8S_CONTEXT}`,
    );
    expect(context).toBe(K8S_CONTEXT);
  }

  private shell = (
    cmd: string,
  ): {
    stdout: string;
    stderr: string;
    code: number;
  } => exec(cmd, { cwd: path.join(__dirname, "yaml") });
}

@Module({
  imports: [],
  providers: [K8sPrepService],
})
export class K8sPrepModule {}
