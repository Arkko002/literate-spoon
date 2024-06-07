import { Socket } from "net";
import { Err, Ok, RedosError, Result } from "../error-handling";
import { ConnectionErrorKind } from "./connection.error";
import eventLoop, { IEventLoop, LoopEvent, LoopEventHandler } from "../event";
import { handleCommand } from "../commands";
import { ISubscriber } from "../stream/pubsub";

export interface IConnection {
  read(): Buffer | null;
  isClosed(): boolean;
  close(): void;
  // TODO: Accept output with RESP only
  scheduleOutput(output: string): void;
  write(output: string): void;
}

export abstract class IConnectionOutput {
  public conn: IConnection;
  public output: string;

  public constructor(conn: IConnection, output: string) {
    this.conn = conn;
    this.output = output;
  }
}

export type ConnectionId = string;

export class Connection implements IConnection, ISubscriber {
  public id: ConnectionId;
  private socket: Socket;

  // TODO: In subscription mode only pubsub commands are accepted
  private isInSubscriptionMode: boolean;
  private subscribedChannels: Set<string>;
  private subscribedPatterns: Set<string>;

  public constructor(socket: Socket, id: string) {
    this.id = id;
    this.socket = socket;
    this.isInSubscriptionMode = false;
    this.subscribedChannels = new Set();
    this.subscribedPatterns = new Set();
  }

  public notify(message: string, source: string): void {
    console.log(`Conn ${this.id} notified by ${source}`);
    this.scheduleOutput(message);
  }

  public read(): Buffer | null {
    return this.socket.read();
  }

  public isClosed(): boolean {
    return this.socket.closed;
  }

  public close(): void {
    this.socket.end();
  }

  public scheduleOutput(output: string): void {
    const conn: IConnection = this;
    const event: LoopEvent<IConnectionOutput> = {
      object: {
        output,
        conn,
      },
      isAsync: false,
      handler: socketOutputHandler,
    };

    eventLoop.addEvent(event);
  }

  public write(output: string): void {
    this.socket.write(output);
  }

  public addChannelSubscription(channel: string): number {
    this.isInSubscriptionMode = true;
    this.subscribedChannels.add(channel);
    return this.subscribedChannels.size;
  }

  public removeChannelSubscription(channel: string): number {
    this.subscribedChannels.delete(channel);

    if (
      this.subscribedChannels.size === 0 &&
      this.subscribedPatterns.size === 0
    ) {
      this.isInSubscriptionMode = false;
    }

    return this.subscribedChannels.size;
  }

  public getChannelSubscriptionCount(): Result<number, RedosError> {
    if (!this.isInSubscriptionMode) {
      return Err(
        new RedosError(
          `Not in subscription mode: ${this.id}`,
          ConnectionErrorKind.NOT_IN_SUBSCRIPTION_MODE,
        ),
      );
    }

    return Ok(this.subscribedChannels.size);
  }

  public addPatternSubscription(pattern: string): number {
    this.subscribedPatterns.add(pattern);
    return this.subscribedPatterns.size;
  }

  public removePatternSubscription(pattern: string): number {
    this.subscribedPatterns.delete(pattern);

    if (
      this.subscribedChannels.size === 0 &&
      this.subscribedPatterns.size === 0
    ) {
      this.isInSubscriptionMode = false;
    }

    return this.subscribedPatterns.size;
  }

  public getPatternSubscriptionCount(): Result<number, RedosError> {
    if (!this.isInSubscriptionMode) {
      return Err(
        new RedosError(
          `Not in subscription mode: ${this.id}`,
          ConnectionErrorKind.NOT_IN_SUBSCRIPTION_MODE,
        ),
      );
    }

    return Ok(this.subscribedPatterns.size);
  }
}

interface SocketEventHandler extends LoopEventHandler<Connection> {
  (data: Connection, eventLoop: IEventLoop): void;
}

const socketConnectionHandler: SocketEventHandler = (
  connection: Connection,
  eventLoop: IEventLoop,
) => {
  const data: Buffer | null = connection.read();

  if (connection.isClosed()) {
    return;
  }

  if (data) {
    handleCommand(data, connection.id, eventLoop);
  }

  // TODO: Move connection scheduling to event loop, reschedule connections that were checked after all of them get checked
  eventLoop.addEvent({
    object: connection,
    isAsync: false,
    handler: socketConnectionHandler,
  });
};

interface SocketOutputEventHandler extends LoopEventHandler<IConnectionOutput> {
  (conn: IConnectionOutput, eventLoop: IEventLoop): void;
}

const socketOutputHandler: SocketOutputEventHandler = (
  conn: IConnectionOutput,
) => {
  if (!conn.conn.isClosed()) {
    conn.conn.write(conn.output);
  }
};
