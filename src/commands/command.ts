import { CommandEventHandler } from "./handler/handler";

// NOTE: https://redis.io/docs/latest/commands/command/
// https://github.com/redis/node-redis/blob/master/packages/client/lib/commands/GEOADD.ts
// https://github.com/redis/redis/blob/unstable/src/commands/README.md
// https://github.com/redis/redis/blob/unstable/src/commands/set.json
// TODO: Implement reply schema
// TODO: Implement command flags https://redis.io/docs/latest/commands/command/
// TODO: Implement since version mechanism
export interface Command {
  name: string;
  arity: number;
  arguments: CommandArgument[];
  handler: CommandEventHandler;
}

export enum CommandArgumentType {
  String = "string",
  Number = "number",
  Boolean = "boolean",
  UnixTime = "unix-time",
}

export interface CommandArgument {
  name: string;
  type: CommandArgumentType;
  position?: number;
  optional?: boolean;
  value?: CommandArgumentValueType;
}

export type CommandArgumentValueType =
  | "string"
  | "number"
  | "boolean"
  | "unix-time";

export interface CommandOutput<T> {
  output: T | null;
}
