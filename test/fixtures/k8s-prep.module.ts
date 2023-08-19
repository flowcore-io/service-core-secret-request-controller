import { Injectable, Module, OnApplicationBootstrap } from "@nestjs/common";
import { InjectLogger, LoggerService } from "@flowcore/microservice";
import { exec } from "shelljs";
import * as path from "path";
import { auth, Client } from "cassandra-driver";
import PlainTextAuthProvider = auth.PlainTextAuthProvider;

const K8S_CONTEXT = process.env.LOCAL_K8S_CONTEXT;

@Injectable()
export class K8sPrepService implements OnApplicationBootstrap {
  constructor(
    @InjectLogger(K8sPrepService.name)
    private readonly logger: LoggerService,
  ) {}

  async onApplicationBootstrap() {
    this.logger.info("Installing Metacontroller");
    await this.assertContext();
    this.shell(
      "kubectl apply -k https://github.com/metacontroller/metacontroller/manifests/production",
    );
    this.shell("kubectl apply -f ./namespace.yaml");
    this.logger.info("Installing Custom Resource Controller");
    this.shell("kubectl apply -f ./resource.controller.yaml");

    this.logger.info(`Cleaing up any existing custom resources`);
    this.shell(
      "kubectl delete -f ./temp-org.resource.yaml --grace-period=0 --ignore-not-found=true",
    );

    const client = new Client({
      contactPoints: (process.env.CASSANDRA_CONTACT_POINTS as string).split(
        ",",
      ),
      localDataCenter: "datacenter1",
      authProvider: new PlainTextAuthProvider(
        process.env.CASSANDRA_USERNAME as string,
        process.env.CASSANDRA_PASSWORD as string,
      ),
    });

    await client.execute(`DROP KEYSPACE IF EXISTS temp_org`);
  }

  async createEventSource() {
    this.shell("kubectl apply -f ./temp-org.resource.yaml");
  }

  private shell = (
    cmd: string,
  ): {
    stdout: string;
    stderr: string;
    code: number;
  } => exec(cmd, { cwd: path.join(__dirname, "yaml") });

  private async assertContext() {
    const context = this.shell("kubectl config current-context").stdout.trim();

    this.logger.info(
      `Validating kubectl context: ${context} == ${K8S_CONTEXT}`,
    );
    expect(context).toBe(K8S_CONTEXT);
  }
}

@Module({
  imports: [],
  providers: [K8sPrepService],
})
export class K8sPrepModule {}
