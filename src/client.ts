// const { Socket } = require("net");
// const { encodeClientCommandArray } = require("./commands/resp");
//
// //NOTE: Test client used for debugging
// var client = new Socket();
// client.connect(6379, "127.0.0.1", function () {
//   console.log("Connected");
//   setTimeout(sendCommands, 1000);
// });
//
// function sendCommands() {
//   const pingCommand = encodeClientCommandArray(["PING"]);
//   client.write(pingCommand);
//   const pingWithTextCommand = encodeClientCommandArray(["PING", "PING"]);
//   client.write(pingWithTextCommand);
//   setTimeout(sendCommands, 5000);
// }
//
// client.on("data", function (data: Buffer) {
//   console.log("Received: " + data);
// });
//
// client.on("close", function () {
//   console.log("Connection closed");
