import { Server, Socket } from "net";
import { LoopEventHandler, EventLoop, LoopEvent, IEventLoop } from "./event";
// import { parseCommandBuffer } from "./commands/resp";

// TODO: https://github.com/redis/redis/blob/unstable/src/connection.c
// https://github.com/redis/redis/blob/unstable/src/connection.h#L46
// TODO: https://github.com/redis/redis/blob/unstable/src/networking.c#L2618
export function createServer(eventLoop: EventLoop): Server {
  const server: Server = new Server();
  server.on("connection", (socket: Socket) => {
    const acceptSocketEvent: LoopEvent<Socket> = {
      object: socket,
      isAsync: false,
      handler: socketConnectionHandler,
    };
    eventLoop.addEvent(acceptSocketEvent);
  });

  return server;
}

interface SocketEventHandler extends LoopEventHandler<Socket> {
  (data: Socket, eventLoop: IEventLoop): void;
}

export const socketConnectionHandler: SocketEventHandler = (
  socket: Socket,
  eventLoop: IEventLoop,
) => {
  console.log(`Processing socket: ${JSON.stringify(socket.address())}`);
  const data: Buffer | null = socket.read();

  if (socket.closed) {
    return;
  }

  if (data) {
    // TODO: Parse data and handle it by Command
    // TODO: Write response data to socket / add output event to queue for additional formatting in RESP
  }

  eventLoop.addEvent({
    object: socket,
    isAsync: false,
    handler: socketConnectionHandler,
  });
};
