import { RESPError, RESPErrorKind } from "./error";

export enum RESPType {
  SIMPLE_STRING = "+",
  ERROR = "-",
  INTEGER = ":",
  BULK_STRING = "$",
  ARRAY = "*",
}

export interface RESP<T> {
  type: RESPType;
  raw: Buffer;
  data: T | null;
}

const CLRF: Buffer = Buffer.from("\r\n");
const CL: Buffer = Buffer.from("\r");
const RF: Buffer = Buffer.from("\n");

// TODO: Refactor
// NOTE: Validation rules based on:
// https://redis.io/docs/latest/develop/interact/programmability/triggers-and-functions/concepts/resp_js_conversion/
// https://redis.io/docs/latest/develop/reference/protocol-spec/
export const parseCommandBuffer = (
  input: Buffer,
  commandsResult: RESP<any>[] = [],
): RESP<any>[] => {
  if (!input.length) {
    return commandsResult;
  }

  let commandPointer = 0;
  const lineEndIndex: number = input.indexOf(RF, commandPointer);
  if (!(input[lineEndIndex - 1] === CL[0])) {
    throw new RESPError(
      `Invalid carriage return closing: ${input.toString("ascii")}`,
      RESPErrorKind.INVALID_CARRIAGE_RETURN,
    );
  }

  const respType: RESPType = input.toString("ascii", 0, 1) as RESPType;
  if (respType === undefined) {
    throw new RESPError(
      `Unsupported / invalid RESP type: ${input.toString("ascii")}`,
      RESPErrorKind.INVALID_RESP_TYPE,
    );
  }

  const respRaw: Buffer = input.subarray(0, lineEndIndex + 1);
  const respData: Buffer = input.subarray(1, lineEndIndex - 1);

  switch (respType) {
    case RESPType.SIMPLE_STRING: {
      for (let i = 0; i < respData.length; i++) {
        if (respData[i] === CL[0] || respData[i] === RF[0]) {
          throw new RESPError(
            `Carriage return inside of string: ${input.toString("ascii")}`,
            RESPErrorKind.STRING_WITH_CARRIAGE_RETURN,
          );
        }
      }

      commandsResult.push({
        type: respType,
        raw: respRaw,
        data: respData.toString("ascii"),
      });

      commandPointer = lineEndIndex + 1;
      break;
    }

    case RESPType.ERROR:
      commandsResult.push({
        type: respType,
        raw: respRaw,
        data: respData.toString("ascii"),
      });
      commandPointer = lineEndIndex + 1;
      break;
    case RESPType.INTEGER: {
      if (!respData.length) {
        throw new RESPError(
          `Empty integer: ${input.toString("ascii")}`,
          RESPErrorKind.INTEGER_EMPTY,
        );
      }

      if (
        (respData.toString("ascii", 0, 1) === "-" ||
          respData.toString("ascii", 0, 1) === "+") &&
        respData.length === 1
      ) {
        throw new RESPError(
          `Signed integer without value: ${input.toString("ascii")}`,
          RESPErrorKind.INTEGER_EMPTY,
        );
      }

      const data: number = Number(respData.toString("ascii"));
      if (Number.isNaN(data)) {
        throw new RESPError(
          `Invalid integer: ${input.toString("ascii")}`,
          RESPErrorKind.INTEGER_NOT_NUMBER,
        );
      }
      commandPointer = lineEndIndex + 1;

      commandsResult.push({
        type: respType,
        raw: respRaw,
        data,
      });

      break;
    }

    case RESPType.BULK_STRING: {
      const bulkStringLength: number = Number(respData.toString("ascii"));
      if (Number.isNaN(bulkStringLength)) {
        throw new RESPError(
          `Invalid bulk string length: ${input.toString("ascii")}`,
          RESPErrorKind.BULK_STRING_DECLARED_LENGTH_WRONG,
        );
      }
      if (bulkStringLength === -1) {
        commandsResult.push({
          type: respType,
          raw: respRaw,
          data: null,
        });
      } else if (!bulkStringLength) {
        commandsResult.push({
          type: respType,
          raw: respRaw,
          data: "",
        });
      } else if (input.length < lineEndIndex + bulkStringLength) {
        throw new RESPError(
          `Not enough data for bulk string: ${input.toString("ascii")}`,
          RESPErrorKind.BULK_STRING_NOT_ENOUGH_DATA,
        );
      } else if (
        input[lineEndIndex + bulkStringLength + 1] !== CL[0] ||
        input[lineEndIndex + bulkStringLength + 2] !== RF[0]
      ) {
        throw new RESPError(
          `Invalid carriage return: ${input.toString("ascii")}`,
          RESPErrorKind.INVALID_CARRIAGE_RETURN,
        );
      } else {
        const bulkStringEndIndex: number = input.indexOf(RF, lineEndIndex + 1);

        if (
          bulkStringEndIndex === -1 ||
          input[bulkStringEndIndex - 1] !== CL[0]
        ) {
          throw new RESPError(
            `Invalid carriage return: ${input.toString("ascii")}`,
            RESPErrorKind.INVALID_CARRIAGE_RETURN,
          );
        }

        const bulkString: string = input.toString(
          "ascii",
          lineEndIndex + 1,
          bulkStringEndIndex - 1,
        );

        if (bulkString.length !== bulkStringLength) {
          throw new RESPError(
            `Bulk string declared length wrong: ${input.toString("ascii")}`,
            RESPErrorKind.BULK_STRING_DECLARED_LENGTH_WRONG,
          );
        }

        commandPointer = bulkStringEndIndex + 1;

        commandsResult.push({
          type: respType,
          raw: input.subarray(0, bulkStringEndIndex + 1),
          data: bulkString,
        });
      }
      break;
    }
    case RESPType.ARRAY: {
      const arrayLength: number = Number(respData.toString("ascii"));
      if (Number.isNaN(arrayLength)) {
        throw new RESPError(
          `Invalid array length: ${input.toString("ascii")}`,
          RESPErrorKind.ARRAY_DECLARED_LENGTH_WRONG,
        );
      }

      let arrayLastElementEndLineIndex: number = lineEndIndex + 1;
      for (let i = 0; i <= arrayLength; i++) {
        arrayLastElementEndLineIndex = input.indexOf(
          RF,
          arrayLastElementEndLineIndex + 1,
        );

        if (
          arrayLastElementEndLineIndex === -1 ||
          input[arrayLastElementEndLineIndex - 1] !== CL[0]
        ) {
          throw new RESPError(
            `Invalid array length: ${input.toString("ascii")}`,
            RESPErrorKind.ARRAY_DECLARED_LENGTH_WRONG,
          );
        }
      }

      commandPointer = arrayLastElementEndLineIndex + 1;

      commandsResult.push({
        type: respType,
        raw: input.subarray(0, arrayLastElementEndLineIndex + 1),
        data: parseCommandBuffer(
          input.subarray(lineEndIndex + 1, arrayLastElementEndLineIndex + 1),
          [],
        ),
      });
      break;
    }
  }

  return parseCommandBuffer(input.subarray(commandPointer), commandsResult);
};
