import { RedosError } from "../../error-handling";
import { RESPErrorKind } from "./resp.error";

export enum RESPType {
  SIMPLE_STRING = "+",
  ERROR = "-",
  INTEGER = ":",
  BULK_STRING = "$",
  ARRAY = "*",
}

export interface RESP {
  type: RESPType;
  raw: Buffer;
  data: RESPData;
}

// TODO: RESPData should not be exposed outside of this, map this into primitive values when moving out of parser
export type RESPData = RESP[] | string | number | boolean | null;

type RESPPartial = { parsedRESP: RESP; nextCommandPointer: number };

const CL: Buffer = Buffer.from("\r");
const RF: Buffer = Buffer.from("\n");

export interface RESPParser {
  (input: Buffer): RESP[];
}

// NOTE: Validation rules based on:
// https://redis.io/docs/latest/develop/interact/programmability/triggers-and-functions/concepts/resp_js_conversion/
// https://redis.io/docs/latest/develop/reference/protocol-spec/
export const parseCommandBuffer: RESPParser = (input: Buffer): RESP[] => {
  const commandsResult: RESP[] = [];
  if (!input.length) {
    return commandsResult;
  }

  return parse(input, commandsResult);
};

export const parse = (input: Buffer, commandsResult: RESP[] = []): RESP[] => {
  let commandPointer = 0;
  const lineEndIndex: number = getNextLineEndIndex(input, commandPointer);
  const respType: RESPType = input.toString("ascii", 0, 1) as RESPType;
  if (respType === undefined) {
    throw new RedosError(
      `Unsupported / invalid RESP type: ${input.toString("ascii")}`,
      RESPErrorKind.INVALID_RESP_TYPE,
    );
  }

  const respRaw: Buffer = input.subarray(0, lineEndIndex + 1);
  const respData: Buffer = input.subarray(1, lineEndIndex - 1);

  switch (respType) {
    case RESPType.SIMPLE_STRING: {
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
      const integer: RESPPartial = parseInteger(
        respData,
        respRaw,
        input,
        lineEndIndex,
      );
      commandsResult.push(integer.parsedRESP);
      commandPointer = integer.nextCommandPointer;
      break;
    }
    case RESPType.BULK_STRING: {
      const bulkString: RESPPartial = parseBulkString(
        respData,
        input,
        lineEndIndex,
      );
      commandsResult.push(bulkString.parsedRESP);
      commandPointer = bulkString.nextCommandPointer;
      break;
    }
    case RESPType.ARRAY: {
      const array: RESPPartial = parseArray(
        respData,
        respRaw,
        input,
        lineEndIndex,
      );
      commandsResult.push(array.parsedRESP);
      commandPointer = array.nextCommandPointer;
      break;
    }
  }

  return parse(input.subarray(commandPointer), commandsResult);
};

const getNextLineEndIndex = (resp: Buffer, startIndex: number): number => {
  const lineEndIndex: number = resp.indexOf(RF, startIndex);
  if (lineEndIndex === -1) {
    throw new RedosError(
      `Invalid carriage return: ${resp.toString("ascii")}`,
      RESPErrorKind.INVALID_CARRIAGE_RETURN,
    );
  }

  if (resp[lineEndIndex - 1] !== CL[0]) {
    throw new RedosError(
      `Invalid carriage return: ${resp.toString("ascii")}`,
      RESPErrorKind.INVALID_CARRIAGE_RETURN,
    );
  }

  // NOTE: Covers cases like $5\rhello\r\n and $5\r\nhe\rlo\r\n
  const carriageReturnIndex: number = resp.indexOf(CL, startIndex);
  if (carriageReturnIndex !== lineEndIndex - 1) {
    throw new RedosError(
      `Invalid carriage return: ${resp.toString("ascii")}`,
      RESPErrorKind.INVALID_CARRIAGE_RETURN,
    );
  }

  return lineEndIndex;
};

// TODO: Refactor further if possible
const parseBulkString = (
  bulkStringLengthData: Buffer,
  input: Buffer,
  lineEndIndex: number,
): RESPPartial => {
  const bulkStringLength: number = Number(
    bulkStringLengthData.toString("ascii"),
  );
  if (
    Number.isNaN(bulkStringLength) ||
    bulkStringLengthData.length === 0 ||
    bulkStringLength < -1
  ) {
    throw new RedosError(
      `Invalid bulk string length: ${input.toString("ascii")}`,
      RESPErrorKind.BULK_STRING_DECLARED_LENGTH_WRONG,
    );
  }
  if (bulkStringLength === -1) {
    return {
      parsedRESP: {
        type: RESPType.BULK_STRING,
        raw: input.subarray(0, lineEndIndex + 1),
        data: false,
      },
      nextCommandPointer: lineEndIndex + 1,
    };
  } else if (bulkStringLength === 0) {
    return {
      parsedRESP: {
        type: RESPType.BULK_STRING,
        raw: input.subarray(0, lineEndIndex + 3),
        data: "",
      },
      nextCommandPointer: lineEndIndex + 3,
    };
  } else if (input.length < lineEndIndex + bulkStringLength) {
    throw new RedosError(
      `Not enough data for bulk string: ${input.toString("ascii")}`,
      RESPErrorKind.BULK_STRING_NOT_ENOUGH_DATA,
    );
  } else {
    const bulkStringEndIndex: number = getNextLineEndIndex(
      input,
      lineEndIndex + 1,
    );

    const bulkString: string = input.toString(
      "ascii",
      lineEndIndex + 1,
      bulkStringEndIndex - 1,
    );

    if (bulkString.length !== bulkStringLength) {
      throw new RedosError(
        `Bulk string declared length wrong: ${input.toString("ascii")}`,
        RESPErrorKind.BULK_STRING_DECLARED_LENGTH_WRONG,
      );
    }

    return {
      parsedRESP: {
        type: RESPType.BULK_STRING,
        raw: input.subarray(0, bulkStringEndIndex + 1),
        data: bulkString,
      },

      nextCommandPointer: bulkStringEndIndex + 1,
    };
  }
};

const parseInteger = (
  respData: Buffer,
  respRaw: Buffer,
  input: Buffer,
  lineEndIndex: number,
): RESPPartial => {
  const data: number = Number(respData.toString("ascii"));
  if (Number.isNaN(data) || respData.length === 0) {
    throw new RedosError(
      `Invalid integer: ${input.toString("ascii")}`,
      RESPErrorKind.INTEGER_NOT_NUMBER,
    );
  }

  return {
    parsedRESP: {
      type: RESPType.INTEGER,
      raw: respRaw,
      data,
    },
    nextCommandPointer: lineEndIndex + 1,
  };
};

// TODO: Refactor further if possible
const parseArray = (
  respData: Buffer,
  respRaw: Buffer,
  input: Buffer,
  lineEndIndex: number,
): RESPPartial => {
  const arrayLength: number = Number(respData.toString("ascii"));
  if (Number.isNaN(arrayLength) || respData.length === 0 || arrayLength < -1) {
    throw new RedosError(
      `Invalid array length: ${input.toString("ascii")}`,
      RESPErrorKind.ARRAY_DECLARED_LENGTH_WRONG,
    );
  } else if (arrayLength === 0) {
    return {
      parsedRESP: {
        type: RESPType.ARRAY,
        raw: input.subarray(0, lineEndIndex + 3),
        data: [],
      },
      nextCommandPointer: lineEndIndex + 3,
    };
  } else if (arrayLength === -1) {
    return {
      parsedRESP: {
        type: RESPType.ARRAY,
        raw: respRaw,
        data: false,
      },
      nextCommandPointer: lineEndIndex + 1,
    };
  } else {
    let arrayLastElementEndLineIndex: number = lineEndIndex + 1;
    for (let i = 0; i <= arrayLength; i++) {
      arrayLastElementEndLineIndex = getNextLineEndIndex(
        input,
        arrayLastElementEndLineIndex + 1,
      );
    }

    return {
      parsedRESP: {
        type: RESPType.ARRAY,
        raw: input.subarray(0, arrayLastElementEndLineIndex + 1),
        data: parse(
          input.subarray(lineEndIndex + 1, arrayLastElementEndLineIndex + 1),
          [],
        ),
      },
      nextCommandPointer: arrayLastElementEndLineIndex + 1,
    };
  }
};
