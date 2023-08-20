import { AppModule } from "../src/app.module";
import { NestApplicationBuilder } from "@jbiskur/nestjs-test-utilities";
import { INestApplication, Module } from "@nestjs/common";
import { LoggerModulePlugin } from "@flowcore/testing-microservice";
import { K8sPrepModule, K8sPrepService } from "./fixtures/k8s-prep.module";
import { Transport } from "@nestjs/microservices";
import { exec } from "shelljs";
import waitForExpect from "wait-for-expect";
import { faker } from "@faker-js/faker";

describe("Org Event Source Controller (e2e)", () => {
  jest.setTimeout(1000000);
  let receiver: INestApplication;
  let app: INestApplication;
  let k8sPrep: K8sPrepService;

  beforeAll(async () => {
    @Module({
      imports: [K8sPrepModule],
    })
    class TestPrepModule {}

    receiver = await new NestApplicationBuilder()
      .withTestModule((builder) => builder.withModule(TestPrepModule))
      .with(LoggerModulePlugin)
      .build();

    k8sPrep = await receiver.resolve(K8sPrepService);

    app = await new NestApplicationBuilder()
      .withTestModule((builder) => builder.withModule(AppModule))
      .buildAsMicroservice(
        {
          transport: Transport.NATS,
          options: {
            servers: ["nats://localhost:4222"],
          },
        },
        3901,
      );
  });

  it("should create event source states", async () => {
    const secretName =
      `${faker.word.adjective()}-${faker.word.noun()}`.toLowerCase();

    await k8sPrep.createSourceSecret(secretName, {
      hello: Buffer.from("world", "utf8").toString("base64"),
    });

    await k8sPrep.createSecretRequest(
      `${secretName}-sr`,
      secretName,
      secretName,
    );
    await waitForExpect(
      async () => {
        const secrets = exec(
          "kubectl get secret -n temp-org -o jsonpath='{.items[*].metadata.name}'",
          {
            silent: true,
          },
        ).stdout.split(" ");
        expect(secrets.includes(secretName)).toBe(true);
      },
      30000,
      2000,
    );
  });

  afterAll(async () => {
    await app.close();
    await receiver.close();
  });
});
