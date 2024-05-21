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

// TODO: This only a compile time check, good for libs but not usable in our case, I think?
export type MaximumOneOf<T, K extends keyof T = keyof T> = K extends keyof T
  ? { [P in K]?: T[K] } & Partial<Record<Exclude<keyof T, K>, never>>
  : never;

export interface CommandOutput<T> {
  output: T | null;
}
