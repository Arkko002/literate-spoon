import { CommandsErrorKind } from "../commands/commands/commands.error";
import { CommandHandlerErrorKind } from "../commands/handler/handler.error";
import { RESPErrorKind } from "../commands/resp/resp.error";
import { DatabaseErrorKind } from "../db/db";
import { ConnectionErrorKind } from "../server/connection.error";
import { ServerErrorKind } from "../server/server.error";
import { PubSubErrorKind } from "../stream/pubsub.error";
import { StreamErrorKind } from "../stream/stream/stream.error";
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
  | PubSubErrorKind
| StreamErrorKind
  | ConnectionErrorKind
  | ServerErrorKind;
