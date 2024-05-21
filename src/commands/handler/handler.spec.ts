import { describe, expect, test } from "@jest/globals";
import { RESP, RESPType } from "../resp/parser";
import { CommandEvent, CommandName, mapRESPToCommandEvent } from "./handler";
import { CommandHandlerErrorKind } from "./handler.error";
import { CustomError } from "../../error-handling";

describe("mapRESPToCommandEvent", () => {
  test("it maps a valid RESP into a CommandEvent", () => {
    const ping: RESP = {
      raw: Buffer.from("*2\r\n$4\r\nPING\r\n$3\r\nabc\r\n"),
      data: [
        {
          raw: Buffer.from("$4\r\nPING\r\n$3\r\nabc\r\n"),
          data: "PING",
          type: RESPType.BULK_STRING,
        },
      ],
      type: RESPType.ARRAY,
    };

    const command: CommandEvent[] = mapRESPToCommandEvent([ping]);

    expect(command.length).toBe(1);
    expect(command[0].name).toBe(CommandName.ECHO);
    expect(command[0].args).toStrictEqual(["abc"]);
  });

  test("it throws an error on invalid command name", () => {
    expect.assertions(2);
    const notPing: RESP = {
      raw: Buffer.from("*2\r\n$4\r\nNOTPING\r\n$3\r\nabc\r\n"),
      data: [
        {
          raw: Buffer.from("$4\r\nNOTPING\r\n$3\r\nabc\r\n"),
          data: "NOTPING",
          type: RESPType.BULK_STRING,
        },
      ],
      type: RESPType.ARRAY,
    };

    try {
      const _ = mapRESPToCommandEvent([notPing]);
    } catch (err) {
      const error = err as CustomError;
      expect(error).toBeInstanceOf(CustomError);
      expect(error.kind).toBe(CommandHandlerErrorKind.NOT_A_VALID_COMMAND);
    }
  });
});

// describe("handleCommand", () => {
//   test("it handles a valid command", () => {
//     const rawPing: Buffer = Buffer.from("*1\r\n$4\r\nPING\r\n");
//     const parsedPing: RESP = {
//       raw: Buffer.from("*1\r\n$4\r\nPING\r\n"),
//       data: [
//         {
//           raw: Buffer.from("$4\r\nPING\r\n"),
//           data: "PING",
//           type: RESPType.BULK_STRING,
//         },
//       ],
//       type: RESPType.ARRAY,
//     };
//     const mockParser: RESPParser = () => {
//       return parsedPing;
//     };
//
//     const command: CommandEvent = handleCommand(rawPing, mockParser);
//   });
// });
