import { Controller, Injectable, Module } from "@nestjs/common";
import {
  ClientProxy,
  ClientProxyFactory,
  EventPattern,
  Payload,
  Transport,
} from "@nestjs/microservices";
import { TOPIC_INGESTION_CHANNEL } from "../../src/messages/source/topics";
import { ChannelEvent } from "../../src/messages/source/channel-event";
import { lastValueFrom } from "rxjs";

@Controller()
export class NatsReceiver {
  private events = new Map<string, ChannelEvent[]>();

  @EventPattern(TOPIC_INGESTION_CHANNEL)
  public async handleEvent(@Payload() event: ChannelEvent) {
    if (!this.events.has(event.eventType)) {
      this.events.set(event.eventType, []);
    }
    this.events.set(event.eventType, [
      ...this.events.get(event.eventType) || [],
      event,
    ]);
  }

  getPayload<T>(eventType: string, predicate: (event: T) => boolean): T | undefined {
    if (!this.events.has(eventType)) {
      return;
    }

    const events = this.events.get(eventType);

    if (!events) {
      return;
    }

    return events
      .map((event) => JSON.parse(event.serializedPayload) as T)
      .find(predicate);
  }

  countPayloads<T>(
    eventType: string,
    predicate: (event: T) => boolean,
  ): number {
    if (!this.events.has(eventType)) {
      return 0;
    }

    const events = this.events.get(eventType);

    if (!events) {
      return 0;
    }

    return events
      .map((event) => JSON.parse(event.serializedPayload) as T)
      .filter(predicate).length;
  }
}

@Injectable()
export class NatsTesterService {
  constructor(private readonly client: ClientProxy) {}

  public async sendEvent<C, R>(topic: string, payload: C): Promise<R> {
    return await lastValueFrom<R>(this.client.send<R, C>(topic, payload));
  }
}

@Module({
  imports: [],
  controllers: [NatsReceiver],
  providers: [
    {
      provide: ClientProxy,
      useValue: ClientProxyFactory.create({
        transport: Transport.NATS,
        options: {
          servers: ["nats://localhost:4222"],
        },
      }),
    },
    NatsTesterService,
  ],
})
export class ReceiverModule {}
