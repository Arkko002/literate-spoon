import { INotifier, ISubscriber } from "../..";

// NOTE: https://redis.io/docs/latest/develop/data-types/streams/#consumer-groups
// TODO: Types and interfaces
export class ConsumerGroup {
  private name: string;
  private streamKey: string;
  private lastDeliveredId: string;

  private unprocessedMessages: any[];
  private consumers: Consumer[];

  public constructor(name: string, streamKey: string) {
    this.name = name;
    this.streamKey = streamKey;
    this.lastDeliveredId = "";
    this.unprocessedMessages = [];
    this.consumers = [];
  }

  public addConsumer(consumer: Consumer): void {
    this.consumers.push(consumer);
  }
  public removeConsumer(consumer: Consumer): void {}

  // TODO: Messages should be assigned to consumers in a round-robin fashion during processing, and then tracked to make sure they are processed
  public processMessages(): void {
    this.unprocessedMessages.forEach((message: any, index: number) => {});
  }
}

export class Consumer {
  public name: string;
  public pendingMessages: ConsumerMessage[];

  public constructor(name: string) {
    this.name = name;
    this.pendingMessages = [];
  }

  public notify(message: any): boolean {
    // TODO: Send consumer a message
    // TODO: Wait for ACK
    return false;
  }
}

class ConsumerMessage {
  private message: any;
  public consumer: Consumer;
  public state: MessageState;

  public constructor(message: any, consumer: Consumer) {
    this.message = message;
    this.consumer = consumer;
    this.state = MessageState.NEW;
  }

  public setPending(): void {
    this.state = MessageState.PENDING;
  }

  public setProcessed(): void {
    this.state = MessageState.PROCESSED;
  }
}

enum MessageState {
  NEW,
  PENDING,
  PROCESSED,
}
