import server from "./server";
import eventLoop from "./event";

server.listen(6379, "127.0.0.1");

eventLoop.startProcessingLoop();
