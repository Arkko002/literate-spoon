import { RedosError, Err, Ok, Result } from "../../error-handling";
import {
  Command,
  CommandArgument,
  CommandArgumentType,
  CommandOutput,
} from "../command";
import { CommandEvent, CommandEventHandler } from "../handler/handler";
import { CommandsErrorKind } from "./commands.error";

const echoHandler: CommandEventHandler = (
  data: CommandEvent,
): Result<CommandOutput<string>, RedosError> => {
  if (data.args.length) {
    return Ok({ output: data.args.join(" ") });
  }

  return Err(
    new RedosError(
      `Not enough arguments for ${data.name}`,
      CommandsErrorKind.NOT_ENOUGH_ARGUMNETS,
    ),
  );
};

const echoArguments: CommandArgument[] = [
  {
    name: "message",
    type: CommandArgumentType.String,
  },
];

export const echo: Command = Object.freeze({
  name: "ECHO",
  arity: 2,
  arguments: echoArguments,
  handler: echoHandler,
});
