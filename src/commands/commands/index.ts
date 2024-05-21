import { Command } from "../command";
import { CommandName } from "../handler/handler";
import { echo } from "./echo";
import { ping } from "./ping";

// TODO: Automate the process of command registration
export const commandsMap: Map<CommandName, Command> = new Map<
  CommandName,
  Command
>([
  [CommandName.PING, ping],
  [CommandName.ECHO, echo],
]);
