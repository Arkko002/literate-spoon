import { LoopEventHandler } from "../event";

// TODO: Create EventCommands from RESP<T>
// function decodeCommands(commandsBuffer: Buffer): CommandEvent[] {
//   const commandsStringArray: string[] =
//     decodeClientCommandArray(commandsBuffer);
//   console.log(`COMMANDS: ${commandsStringArray}`);
//   if (commandsStringArray.length === 0) {
//     return [];
//   }
//
//   commandsStringArray.map((inputString: string): CommandEvent => {});
//
//   return commandsStringArray;
// }

export interface CommandEvent {
  name: CommandName;
  args: string[];
  output: string | undefined;
}

export enum CommandName {
  PING,
  ECHO,
}

export interface EventCommandHandler extends LoopEventHandler<CommandEvent> {
  (data: CommandEvent): void;
}

const eventCommandHandler: EventCommandHandler = (command: CommandEvent) => {
  switch (command.name) {
    case CommandName.PING:
      command.args.length
        ? (command.output = command.args.join(" "))
        : (command.output = "PONG");
      break;
    case CommandName.ECHO:
      command.output = command.args.join(" ");
      break;
  }
};

export const handleRawCommand = (inputBuffer: Buffer): CommandEvent => {
  const command: CommandEvent = {
    name: CommandName.PING,
    args: [],
    output: undefined,
  };
  return command;
};
