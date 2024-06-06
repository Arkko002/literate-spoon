import {
  Command,
  CommandArgument,
  CommandArgumentType,
  CommandOutput,
} from "../command";
import { CommandEvent, CommandEventHandler } from "../handler/handler";

const pingHandler: CommandEventHandler = (
  data: CommandEvent,
): CommandOutput<string> => {
  if (data.args.length) {
    return { output: data.args.join(" ") };
  }

  return { output: "PONG" };
};

const pingArguments: CommandArgument[] = [
  {
    name: "message",
    type: CommandArgumentType.String,
    optional: true,
  },
];

export const ping: Command = Object.freeze({
  name: "PING",
  arity: -1,
  arguments: pingArguments,
  handler: pingHandler,
});
