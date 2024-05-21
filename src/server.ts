import { Server, Socket } from "net";
import { LoopEventHandler, EventLoop, LoopEvent } from "./event";
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
      handler: acceptConnectionHandler,
    };
    eventLoop.addEvent(acceptSocketEvent);
  });

  return server;
}

interface EventSocketHandler extends LoopEventHandler<Socket> {
  (data: Socket): void;
}

export const acceptConnectionHandler: EventSocketHandler = (socket: Socket) => {
  console.log(`Registered new socket: ${JSON.stringify(socket.address())}`);
  socket.on("data", (data: Buffer) => {
    socket.write("Echo server\r\n");
    // const commands = parseCommandBuffer(data);
    // console.log(`COMMANDS: ${commands}`);
    // if (commands.length === 0) {
    //   return;
    // }

    // TODO: Push each command into event loop
    // commands.forEach((command: string, index: number) => {});
  });

  socket.on("end", () => {
    console.log("Connection ended");
  });

  socket.pipe(socket);
};
