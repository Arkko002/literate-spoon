import { CommandsErrorKind } from "../commands/commands/commands.error";
import { CommandHandlerErrorKind } from "../commands/handler/handler.error";
import { RESPErrorKind } from "../commands/resp/resp.error";
import { DatabaseErrorKind } from "../db/db";
import { ServerErrorKind } from "../server/server.error";
import { OptionErrorKind } from "./option";

// TODO: Should this be used for both Result<err> and exceptions or only exceptions?
export class RedosError extends Error {
  constructor(
    public message: string,
    public kind: ErrorKind,
  ) {
    super(message);
  }
}

export type ErrorKind =
  | RESPErrorKind
  | CommandHandlerErrorKind
  | OptionErrorKind
  | CommandsErrorKind
  | DatabaseErrorKind
  | ServerErrorKind;
