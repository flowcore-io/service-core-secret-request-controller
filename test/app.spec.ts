import { AppModule } from "../src/app.module";
import { NestApplicationBuilder } from "@jbiskur/nestjs-test-utilities";
import {
  NatsReceiver,
  NatsTesterService,
  ReceiverModule,
} from "./fixtures/nats-tester";
import { INestApplication, Module } from "@nestjs/common";
import { Transport } from "@nestjs/microservices";
import { LoggerModulePlugin } from "@flowcore/testing-microservice";
import { K8sPrepModule, K8sPrepService } from "./fixtures/k8s-prep.module";
import waitForExpect from "wait-for-expect";
import { exec } from "shelljs";

describe("Org Event Source Controller (e2e)", () => {
  jest.setTimeout(1000000);
  let receiver: INestApplication;
  let app: INestApplication;
  let sender: NatsTesterService;
  let natsReceiver: NatsReceiver;
  let k8sPrep: K8sPrepService;

  beforeAll(async () => {
    @Module({
      imports: [ReceiverModule, K8sPrepModule],
    })
    class TestPrepModule {}

    receiver = await new NestApplicationBuilder()
      .withTestModule((builder) => builder.withModule(TestPrepModule))
      .with(LoggerModulePlugin)
      .buildAsMicroservice({
        transport: Transport.NATS,
        options: {
          servers: ["nats://localhost:4222"],
        },
      });

    sender = await receiver.resolve(NatsTesterService);
    natsReceiver = await receiver.resolve(NatsReceiver);
    k8sPrep = await receiver.resolve(K8sPrepService);

    app = await new NestApplicationBuilder()
      .withTestModule((testModule) => testModule.withModule(AppModule))
      .buildAsMicroservice({
        transport: Transport.NATS,
        options: {
          servers: ["nats://localhost:4222"],
          queue: "test-org-event-source-controller",
        },
      });
  });

  it("should create event source states", async () => {
    // await k8sPrep.createEventSource();
    // await waitForExpect(
    //   async () => {
    //     exec("kubectl get pods -n temp-org -o wide");
    //     expect(
    //       natsReceiver.getPayload<SourcedEventOrganizationEventSourceStateUpdated>(
    //         SOURCE_EVENT_ORGANIZATION_EVENT_SOURCE_STATE_UPDATED,
    //         (event) =>
    //           event.state ===
    //           FLOWCORE_ENUM_ORGANIZATION_EVENT_SOURCE_STATE.INITIALIZING,
    //       ),
    //     ).toEqual(
    //       expect.objectContaining({
    //         organizationId: "9aa71274-d70f-4e38-ad34-df7ffdbf9e88",
    //         state: FLOWCORE_ENUM_ORGANIZATION_EVENT_SOURCE_STATE.INITIALIZING,
    //       }),
    //     );
    //     expect(
    //       natsReceiver.getPayload<SourcedEventOrganizationEventSourceStateUpdated>(
    //         SOURCE_EVENT_ORGANIZATION_EVENT_SOURCE_STATE_UPDATED,
    //         (event) =>
    //           event.state ===
    //           FLOWCORE_ENUM_ORGANIZATION_EVENT_SOURCE_STATE.READY,
    //       ),
    //     ).toEqual(
    //       expect.objectContaining({
    //         organizationId: "9aa71274-d70f-4e38-ad34-df7ffdbf9e88",
    //         state: FLOWCORE_ENUM_ORGANIZATION_EVENT_SOURCE_STATE.READY,
    //       }),
    //     );
    //   },
    //   450000,
    //   5000,
    // );
  });

  afterAll(async () => {
    await app.close();
    await receiver.close();
  });
});
