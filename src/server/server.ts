import { Server, Socket } from "net";
import eventLoop, { LoopEventHandler, LoopEvent, IEventLoop } from "../event";
import { Connection } from "./connection";
import { Err, Ok, RedosError, Result } from "../error-handling";
import { ServerErrorKind } from "./server.error";
import { handleCommand } from "../commands";

export interface IServer {
  listen(port: number, address: string): void;
  write(output: string, connectionId: string): Result<null, RedosError>;
}

// TODO: https://github.com/redis/redis/blob/unstable/src/connection.c
// https://github.com/redis/redis/blob/unstable/src/connection.h#L46
// TODO: https://github.com/redis/redis/blob/unstable/src/networking.c#L2618
class RedosServer implements IServer {
  private static _instance: RedosServer;
  private connections: Map<string, Connection> = new Map();
  private server: Server;

  private constructor(eventLoop: IEventLoop) {
    this.server = new Server();
    this.server.on("connection", (socket: Socket) => {
      // TODO: Connection ID based on what? Hash? Incrementing Pk?
      const conn: Connection = new Connection(socket, socket.remoteAddress!);
      if (this.connections.has(conn.id)) {
        // TODO:
      }

      this.connections.set(conn.id, conn);

      const acceptSocketEvent: LoopEvent<Connection> = {
        object: conn,
        isAsync: false,
        handler: socketConnectionHandler,
      };
      eventLoop.addEvent(acceptSocketEvent);
    });
  }

  public listen(port: number, address: string): void {
    this.server.listen(port, address);
  }

  public static get Instance() {
    return this._instance || (this._instance = new RedosServer(eventLoop));
  }

  public write(output: string, connectionId: string): Result<null, RedosError> {
    // TODO: Parse output into RESP Buffer before sending
    const conn: Connection | undefined = this.connections.get(connectionId);
    if (!conn) {
      return Err(
        new RedosError(
          `No connection with ID ${connectionId} in server connection list`,
          ServerErrorKind.CONNECTION_ID_NOT_FOUND,
        ),
      );
    }

    conn.write(output);

    return Ok(null);
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

const server: IServer = RedosServer.Instance;
export default server;
