import { Server } from "net";
import { EventLoop } from "./event";
import { createServer } from "./server";

const eventLoop: EventLoop = new EventLoop();
const server: Server = createServer(eventLoop);
server.listen(6379, "127.0.0.1");

eventLoop.startProcessingLoop();
