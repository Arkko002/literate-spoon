import { CustomError, Err, Ok, Result } from "../../error-handling";
import { EventLoop, LoopEventHandler } from "../../event";
import { Command, CommandArgument } from "../command";
import { commandsMap } from "../commands";
import { RESP, RESPData, RESPParser, RESPType } from "../resp/parser";
import { CommandHandlerErrorKind } from "./handler.error";

export interface CommandEvent {
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
  parseFunc: RESPParser,
  eventLoop: EventLoop,
): void => {
  const parsedResp: RESP[] = parseFunc(input);
  const commands: CommandEvent[] = mapRESPToCommandEvents(parsedResp);

  // for (const command of commands) {
  //   eventLoop.addEvent({
  //     object: command,
  //     handler: eventCommandHandler,
  //     isAsync: false,
  //   });
  // }
};

export interface CommandEventHandler extends LoopEventHandler<CommandEvent> {
  (data: CommandEvent): void;
}

// TODO: Should error in parsing one command fail the whole process?
// TODO: Should we flatten sets / arrays before mapping them?
export const mapRESPToCommandEvents = (
  resp: RESP[],
): Result<CommandEvent[], CustomError> => {
  let cursor: number = 0;
  const commandEvents: CommandEvent[] = [];
  for (const element of resp) {
    // if (element.type === RESPType.ARRAY) {
    //   parseArrayCommands(element.data as RESP[]);
    // }

    const commandResult: Result<Command, CustomError> = getCommand(element);
    if (commandResult.isOk()) {
      const command: Command = commandResult.unwrap();
      const { args, cursorPosition } = getCommandArguments(resp, cursor);
      commandEvents.push({
        name: command.name as CommandName,
        args,
        handler: command.handler,
      });

      cursor = cursorPosition;
    } else {
      // TODO: Should error in parsing one command fail the whole process?
      return Err(commandResult.error);
    }
  }

  return Err(
    new CustomError(
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
): Result<RESP, CustomError> => {
  if (cursor >= resp.length - 1) {
    Err(
      new CustomError(
        `Cursor outside of bounds`,
        CommandHandlerErrorKind.NO_NEXT_ELEMENT,
      ),
    );
  }

  return Ok(resp[cursor + 1]);
};

const getCommand = (resp: RESP): Result<Command, CustomError> => {
  const command: Command | undefined = commandsMap.get(
    resp.data as CommandName,
  );
  if (command === undefined) {
    return Err(
      new CustomError(
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
const parseArrayCommands = (
  elements: RESP[],
): Result<Command[], CustomError> => {
  if (elements.length === undefined || elements.length === 0) {
    return Err(
      new CustomError(
        `Set of commands empty or undefined: ${resp.raw}`,
        CommandHandlerErrorKind.NOT_A_VALID_COMMAND,
      ),
    );
  }

  let cursor: number = 0;
  for (const element of elements) {
    const commandResult: Result<Command, CustomError> = getCommand(element);
    if (commandResult.isOk()) {
      const command: Command = commandResult.value;
      const arguments: CommandArgument[] = [];
    }

    // TODO: Better mechanism for unwrapping results and bubbling up errors
    if (commandResult.isErr()) {
      return Err(commandResult.error);
    }
  }
  return Ok([]);
};

// const mapRESPToCommandEvent = (
//   resp: RESP,
// ): Result<CommandEvent, CustomError> => {
//   if (resp.type === RESPType.ARRAY) {
//   }
//
//   const data = resp.data as string;
//   const splitResp: string[] = data.split(" ");
//
//   const name: CommandName | undefined = data[0] as CommandName;
//   if (name === undefined) {
//     return Err(
//       new CustomError(
//         `Unsupported command: ${name}`,
//         CommandHandlerErrorKind.NOT_A_VALID_COMMAND,),
//     );
//   }
//
//   return Ok({
//     name,
//     args: splitResp.slice(1),
//     output: undefined,
//   });
// };
