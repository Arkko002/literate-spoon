import { Server, Socket } from "net";
import { LoopEventHandler, EventLoop, LoopEvent } from "./event";
import { CLRF } from "./commands/resp/util";
import { decodeClientCommandArray } from "./commands/resp";

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
  socket.on("data", (data) => {
    socket.write("Echo server\r\n");
    const commands: string[] = decodeClientCommandArray(data);
    console.log(`COMMANDS: ${commands}`);
    if (commands.length === 0) {
      return;
    }

    commands.forEach((command: string, index: number) => {
      if (command === "PING") {
        if (
          commands[index + 1] &&
          commands[index + 1] !== commands[index + 1].toUpperCase()
        ) {
          socket.write(`+${commands[index + 1]}${CLRF}`);
        } else {
          socket.write(`+PONG${CLRF}`);
        }
      }
    });
  });

  socket.on("end", () => {
    console.log("Connection ended");
  });

  socket.pipe(socket);
};
