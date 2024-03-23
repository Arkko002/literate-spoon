import net from "net";

const server = net.createServer((socket: net.Socket) => {
  console.log("listening");
  socket.write("Echo server\r\n");
  socket.pipe(socket);
});
server.on("error", (err: Error) => {
  console.log(err.message);
});

server.listen(6379, "127.0.0.1");
