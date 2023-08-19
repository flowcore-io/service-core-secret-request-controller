import {
  Controller,
  Inject,
  Injectable,
  Module,
  OnModuleInit,
} from "@nestjs/common";
import { ClientGrpc, ClientsModule, Transport } from "@nestjs/microservices";
import {
  DATA_PUMP_ADAPTER_PACKAGE_NAME,
  DATA_PUMP_ADAPTER_SERVICE_NAME,
  DataPumpAdapterClient,
  ProcessResult,
} from "../../src/messages/source/data-pump-adapter";
import { DATA_PUMP_ADAPTER_PORT } from "./constants";
import * as path from "path";
import { Observable, ReplaySubject } from "rxjs";
import { SourceEvent } from "../../src/messages/source/event-source";
import {
  DataPumpOperationResult,
  DataPumpServiceController,
  DataPumpServiceControllerMethods,
  InfoResponse,
} from "../../src/messages/source/data-pump";

@Injectable()
export class DataPumpFeederService implements OnModuleInit {
  private adapterClient: DataPumpAdapterClient;

  constructor(
    @Inject(DATA_PUMP_ADAPTER_PACKAGE_NAME)
    private readonly grpcClient: ClientGrpc,
  ) {}

  async onModuleInit() {
    this.adapterClient = this.grpcClient.getService<DataPumpAdapterClient>(
      DATA_PUMP_ADAPTER_SERVICE_NAME,
    );
  }

  public openChannel(
    writeStream: ReplaySubject<SourceEvent>,
  ): Observable<ProcessResult> {
    const readStream = this.adapterClient.processEvent(writeStream);

    readStream.subscribe({
      next: (result) => {
        if (!result.success) {
          console.error(result.error);
        }
      },
    });

    return readStream;
  }
}

@Controller()
@DataPumpServiceControllerMethods()
export class DataPumpFeederController implements DataPumpServiceController {
  private running = false;
  private started = false;

  async info(): Promise<InfoResponse> {
    return {
      running: this.running,
      started: this.started,
      interval: 30000,
    };
  }

  async setState(): Promise<DataPumpOperationResult> {
    return {
      success: true,
    };
  }

  async start(): Promise<DataPumpOperationResult> {
    this.started = true;
    this.running = true;
    return {
      success: true,
    };
  }

  async stop(): Promise<DataPumpOperationResult> {
    this.started = false;
    this.running = false;
    return {
      success: true,
    };
  }
}

@Module({
  imports: [
    ClientsModule.register([
      {
        name: DATA_PUMP_ADAPTER_PACKAGE_NAME,
        transport: Transport.GRPC,
        options: {
          package: DATA_PUMP_ADAPTER_PACKAGE_NAME,
          url: `localhost:${DATA_PUMP_ADAPTER_PORT}`,
          protoPath: path.join(
            __dirname,
            "../../src/assets/messages/domains/source/data-pump-adapter.proto",
          ),
        },
      },
    ]),
  ],
  controllers: [DataPumpFeederController],
  providers: [DataPumpFeederService],
})
export class DataPumpFeederModule {}
