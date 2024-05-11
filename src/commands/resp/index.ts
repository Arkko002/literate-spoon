enum RESPType {
  SIMPLE_STRING = "+",
  ERROR = "-",
  INTEGER = ":",
  BULK_STRING = "$",
  ARRAY = "*",
}

interface RESP<T> {
  type: RESPType;
  raw: Buffer;
  data: T | null;
}

const CLRF: Buffer = Buffer.from("\r\n");
const CL: Buffer = Buffer.from("\r");
const RF: Buffer = Buffer.from("\n");

// TODO: Refactor
// TODO: Better parsing error reporting
// TODO: Buffer to integer casting, endianess between machines
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
  const lineEndIndex: number = input.indexOf(RF[0], commandPointer);
  if (!(input[lineEndIndex - 1] === CL[0])) {
    return [];
  }

  const respType: RESPType =
    RESPType[input.toString("ascii", 0, 1) as keyof typeof RESPType];
  if (respType === undefined) {
    return [];
  }

  const respRaw: Buffer = input.subarray(0, lineEndIndex);
  const respData: Buffer = input.subarray(1, lineEndIndex - 2);

  switch (respType) {
    case RESPType.SIMPLE_STRING: {
      for (let i = 0; i < respData.length; i++) {
        if (respData[i] === CL[0] || respData[i] === RF[0]) {
          return [];
        }
      }

      commandsResult.push({
        type: respType,
        raw: respRaw,
        data: respData.toString("ascii"),
      });

      break;
    }

    case RESPType.ERROR:
      commandsResult.push({
        type: respType,
        raw: respRaw,
        data: respData.toString("ascii"),
      });
    case RESPType.INTEGER: {
      if (!respData.length) {
        return [];
      }

      if (
        (respData.toString("ascii", 0, 1) === "-" ||
          respData.toString("ascii", 0, 1) === "+") &&
        respData.length === 1
      ) {
        return [];
      }

      // TODO: Is this a good validation method for 0..9?
      for (let i = 0; i < respData.length; i++) {
        const value = Number(respData[i]);
        if (value < 0 || value > 9) {
          return [];
        }
      }

      commandsResult.push({
        type: respType,
        raw: respRaw,
        data: Number(respData),
      });

      break;
    }

    case RESPType.BULK_STRING: {
      if (respData.length === -1) {
        commandsResult.push({
          type: respType,
          raw: respRaw,
          data: null,
        });
      } else if (!respData.length) {
        commandsResult.push({
          type: respType,
          raw: respRaw,
          data: "",
        });
      } else if (input.length < lineEndIndex + Number(respData) + 2) {
        return [];
      } else if (
        input[lineEndIndex + Number(respData)] !== CL[0] ||
        input[lineEndIndex + Number(respData) + 1] !== RF[0]
      ) {
        // TODO: Test if should be respData or respData + 1 / respData + 2
        return [];
      } else {
        const bulkStringEndIndex: number = input
          .subarray(lineEndIndex)
          .indexOf(CLRF);

        const bulkString: string = input.toString(
          "ascii",
          lineEndIndex + 1,
          bulkStringEndIndex - 2,
        );

        if (bulkString.length !== Number(respData)) {
          return [];
        }

        commandsResult.push({
          type: respType,
          raw: respRaw,
          data: bulkString,
        });
      }
    }
    case RESPType.ARRAY:
      // TODO: Is this a good validation method for 0..9?
      for (let i = 0; i < respData.length; i++) {
        const value = Number(respData[i]);
        if (value < 0 || value > 9) {
          return [];
        }
      }

      const numberOfElements: number = respData.readInt32LE(0);
      let arrayLastElementEndLineIndex: number = lineEndIndex + 1;
      for (let i = 1; i <= numberOfElements; i++) {
        arrayLastElementEndLineIndex = input
          .subarray(arrayLastElementEndLineIndex)
          .indexOf(RF);
      }

      commandsResult.push({
        type: respType,
        raw: respRaw,
        data: parseCommandBuffer(
          input.subarray(lineEndIndex + 1, arrayLastElementEndLineIndex),
          [],
        ),
      });
  }

  commandPointer = lineEndIndex + 1;
  return parseCommandBuffer(input.subarray(commandPointer), commandsResult);
};
