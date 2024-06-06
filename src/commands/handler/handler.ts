import { RedosError, Err, Ok, Result } from "../../error-handling";
import {
  EventLoop,
  IEventLoop,
  LoopEvent,
  LoopEventHandler,
} from "../../event";
import { Command } from "../command";
import { commandsMap } from "../commands";
import { RESP, RESPData, parse } from "../resp/parser";
import { CommandHandlerErrorKind } from "./handler.error";

export interface CommandEvent {
  connectionId: string;
  name: CommandName;
  args: string[];
  handler: CommandEventHandler;
}

// TODO: Possibly not needed anymore since we have Command
export enum CommandName {
  PING = "PING",
  ECHO = "ECHO",
}

export const handleCommand = (
  input: Buffer,
  connectionId: string,
  eventLoop: IEventLoop,
): Result<null, RedosError> => {
  const parsedResp: RESP[] = parse(input);
  const commands: Result<CommandEvent[], RedosError> = mapRESPToCommandEvents(
    parsedResp,
    connectionId,
  );

  if (commands.isOk()) {
    commands.value.forEach((command: CommandEvent) => {
      const event: LoopEvent<CommandEvent> = {
        object: command,
        isAsync: false,
        handler: command.handler,
      };

      eventLoop.addEvent(event);
    });

    return Ok(null);
  } else {
    return Err(commands.error);
  }
};

export interface CommandEventHandler extends LoopEventHandler<CommandEvent> {
  (data: CommandEvent, eventLoop: IEventLoop): void;
}

// TODO: Should error in parsing one command fail the whole process?
// TODO: Should we flatten sets / arrays before mapping them?
const mapRESPToCommandEvents = (
  resp: RESP[],
  connectionId: string,
): Result<CommandEvent[], RedosError> => {
  let cursor: number = 0;
  const commandEvents: CommandEvent[] = [];
  for (const element of resp) {
    // if (element.type === RESPType.ARRAY) {
    //   parseArrayCommands(element.data as RESP[]);
    // }

    const commandResult: Result<Command, RedosError> = getCommand(element);
    if (commandResult.isOk()) {
      const command: Command = commandResult.unwrap();
      const { args, cursorPosition } = getCommandArguments(resp, cursor);

      // TODO: Separate RESPData from args passed to command events
      const argsStr = args.map((value: RESPData) => value!.toString());

      commandEvents.push({
        connectionId,
        name: command.name as CommandName,
        args: argsStr,
        handler: command.handler,
      });

      cursor = cursorPosition;
    } else {
      // TODO: Should error in parsing one command fail the whole process?
      return Err(commandResult.error);
    }
  }

  return Err(
    new RedosError(
      `No commands to process: ${resp}`,
      CommandHandlerErrorKind.NO_NEXT_ELEMENT,
    ),
  );
};

const getCommandArguments = (
  resp: RESP[],
  cursor: number,
): { args: RESPData[]; cursorPosition: number } => {
  let args: RESPData[] = [];

  while (cursor < resp.length) {
    if (isCommand(resp[cursor])) {
      break;
    }

    args.push(resp[cursor].data);
    cursor++;
  }

  return { args, cursorPosition: cursor };
};

const peekNextElement = (
  resp: RESP[],
  cursor: number,
): Result<RESP, RedosError> => {
  if (cursor >= resp.length - 1) {
    Err(
      new RedosError(
        `Cursor outside of bounds`,
        CommandHandlerErrorKind.NO_NEXT_ELEMENT,
      ),
    );
  }

  return Ok(resp[cursor + 1]);
};

const getCommand = (resp: RESP): Result<Command, RedosError> => {
  const command: Command | undefined = commandsMap.get(
    resp.data as CommandName,
  );
  if (command === undefined) {
    return Err(
      new RedosError(
        `Unsupported command: ${resp.data}`,
        CommandHandlerErrorKind.NOT_A_VALID_COMMAND,
      ),
    );
  }

  return Ok(command);
};

const isCommand = (resp: RESP): boolean => {
  return commandsMap.has(resp.data as CommandName);
};

// TODO: https://github.com/redis/redis/blob/unstable/src/networking.c#L2618
// const parseArrayCommands = (
//   elements: RESP[],
// ): Result<Command[], RedosError> => {
//   if (elements.length === undefined || elements.length === 0) {
//     return Err(
//       new RedosError(
//         `Set of commands empty or undefined: ${resp.raw}`,
//         CommandHandlerErrorKind.NOT_A_VALID_COMMAND,
//       ),
//     );
//   }
//
//   let cursor: number = 0;
//   for (const element of elements) {
//     const commandResult: Result<Command, RedosError> = getCommand(element);
//     if (commandResult.isOk()) {
//       const command: Command = commandResult.value;
//       const arguments: CommandArgument[] = [];
//     }
//
//     // TODO: Better mechanism for unwrapping results and bubbling up errors
//     if (commandResult.isErr()) {
//       return Err(commandResult.error);
//     }
//   }
//   return Ok([]);
// };
