import { describe, expect, test } from "@jest/globals";
import { RESP, RESPType, parseCommandBuffer } from "./parser";
import { CustomError } from "../../error";
import { RESPErrorKind } from "./resp.error";

// TODO: Should edge cases of simple string also apply?
describe("Error parser", () => {
  const respType: RESPType = RESPType.ERROR;
  test("it parses error buffer", () => {
    const respRaw: Buffer = Buffer.from("-Error message\r\n");
    const respData: string = "Error message";

    const result: RESP[] = parseCommandBuffer(respRaw);

    expect(result.length).toBe(1);
    expect(result[0].type).toBe(respType);
    expect(result[0].data).toBe(respData);
    expect(result[0].raw).toStrictEqual(respRaw);
  });
});

describe("Integer parser", () => {
  const respType: RESPType = RESPType.INTEGER;

  test("it parses integer buffer", () => {
    const respRaw: Buffer = Buffer.from(":123\r\n");
    const respData: number = 123;

    const result: RESP[] = parseCommandBuffer(respRaw);

    expect(result.length).toBe(1);
    expect(result[0].type).toBe(respType);
    expect(result[0].data).toBe(respData);
  });

  test("it throws an error on empty signed integer", () => {
    expect.assertions(2);
    const respRaw: Buffer = Buffer.from(":-\r\n");

    try {
      parseCommandBuffer(respRaw);
    } catch (er) {
      const error = er as CustomError;
      expect(error).toBeInstanceOf(CustomError);
      expect(error.kind).toBe(RESPErrorKind.INTEGER_NOT_NUMBER);
    }
  });

  test("it throws an error on empty integer buffer", () => {
    expect.assertions(2);
    const respRaw: Buffer = Buffer.from(":\r\n");

    try {
      parseCommandBuffer(respRaw);
    } catch (er) {
      const error = er as CustomError;
      expect(error).toBeInstanceOf(CustomError);
      expect(error.kind).toBe(RESPErrorKind.INTEGER_NOT_NUMBER);
    }
  });
  test("it throws an error when integer is not a number", () => {
    expect.assertions(2);
    const respRaw: Buffer = Buffer.from(":test\r\n");

    try {
      parseCommandBuffer(respRaw);
    } catch (er) {
      const error = er as CustomError;
      expect(error).toBeInstanceOf(CustomError);
      expect(error.kind).toBe(RESPErrorKind.INTEGER_NOT_NUMBER);
    }
  });
});

// TODO: Test for case where bulk string contains /r or /n in data (should be allowed)
describe("Bulk string parser", () => {
  const respType: RESPType = RESPType.BULK_STRING;

  test("it parses bulk string buffer", () => {
    const respRaw: Buffer = Buffer.from("$5\r\nhello\r\n");
    const respData: string = "hello";

    const result: RESP[] = parseCommandBuffer(respRaw);

    expect(result.length).toBe(1);
    expect(result[0].type).toBe(respType);
    expect(result[0].data).toBe(respData);
    expect(result[0].raw).toStrictEqual(respRaw);
  });

  test("it parses empty bulk string buffer", () => {
    const respRaw: Buffer = Buffer.from("$0\r\n\r\n");
    const respData: string = "";

    const result: RESP[] = parseCommandBuffer(respRaw);

    expect(result.length).toBe(1);
    expect(result[0].type).toBe(respType);
    expect(result[0].data).toBe(respData);
    expect(result[0].raw).toStrictEqual(respRaw);
  });

  test("it parses null bulk string buffer", () => {
    const respRaw: Buffer = Buffer.from("$-1\r\n");
    const respData: null = null;

    const result: RESP[] = parseCommandBuffer(respRaw);

    expect(result.length).toBe(1);
    expect(result[0].type).toBe(respType);
    expect(result[0].data).toBe(respData);
    expect(result[0].raw).toStrictEqual(respRaw);
  });

  test("it throws an error when not enough data in buffer", () => {
    expect.assertions(2);
    const respRaw: Buffer = Buffer.from("$10\r\nhello\r\n");

    try {
      parseCommandBuffer(respRaw);
    } catch (er) {
      const error = er as CustomError;
      expect(error).toBeInstanceOf(CustomError);
      expect(error.kind).toBe(RESPErrorKind.BULK_STRING_NOT_ENOUGH_DATA);
    }
  });

  test("it throws an error when declared length is wrong", () => {
    expect.assertions(2);
    const respRaw: Buffer = Buffer.from("$3\r\nhello\r\n");

    try {
      parseCommandBuffer(respRaw);
    } catch (er) {
      const error = er as CustomError;
      expect(error).toBeInstanceOf(CustomError);
      expect(error.kind).toBe(RESPErrorKind.BULK_STRING_DECLARED_LENGTH_WRONG);
    }
  });

  test("it throws an error when declared length is negative other than -1", () => {
    expect.assertions(2);
    const respRaw: Buffer = Buffer.from("$-10\r\nhello\r\n");

    try {
      parseCommandBuffer(respRaw);
    } catch (er) {
      const error = er as CustomError;
      expect(error).toBeInstanceOf(CustomError);
      expect(error.kind).toBe(RESPErrorKind.BULK_STRING_DECLARED_LENGTH_WRONG);
    }
  });
});

describe("Array parser", () => {
  const arrayType: RESPType = RESPType.ARRAY;

  test("it parses array buffer", () => {
    const arrayRaw: Buffer = Buffer.from(
      "*4\r\n$5\r\nhello\r\n+world\r\n:123\r\n-Error message\r\n",
    );
    const bulkStringRaw: Buffer = Buffer.from("$5\r\nhello\r\n");
    const bulkStringType: RESPType = RESPType.BULK_STRING;

    const simpleStringRaw: Buffer = Buffer.from("+world\r\n");
    const simpleStringType: RESPType = RESPType.SIMPLE_STRING;

    const integerRaw: Buffer = Buffer.from(":123\r\n");
    const integerType: RESPType = RESPType.INTEGER;

    const errorRaw: Buffer = Buffer.from("-Error message\r\n");
    const errorType: RESPType = RESPType.ERROR;

    const respArrayData: RESP[] = [
      { type: bulkStringType, data: "hello", raw: bulkStringRaw },
      { type: simpleStringType, data: "world", raw: simpleStringRaw },
      { type: integerType, data: 123, raw: integerRaw },
      { type: errorType, data: "Error message", raw: errorRaw },
    ];

    const result = parseCommandBuffer(arrayRaw);

    expect(result.length).toBe(1);
    expect(result[0].type).toBe(arrayType);
    expect(result[0].data).toStrictEqual(respArrayData);
    expect(result[0].raw).toStrictEqual(arrayRaw);
  });

  test("it parses empty array buffer", () => {
    const arrayRaw: Buffer = Buffer.from("*0\r\n");
    const respArrayData: RESP[] = [];

    const result = parseCommandBuffer(arrayRaw);

    expect(result.length).toBe(1);
    expect(result[0].type).toBe(arrayType);
    expect(result[0].data).toStrictEqual(respArrayData);
    expect(result[0].raw).toStrictEqual(arrayRaw);
  });

  test("it parses null array buffer", () => {
    const respRaw: Buffer = Buffer.from("*-1\r\n");
    const respData: null = null;

    const result: RESP[] = parseCommandBuffer(respRaw);

    expect(result.length).toBe(1);
    expect(result[0].type).toBe(arrayType);
    expect(result[0].data).toBe(respData);
    expect(result[0].raw).toStrictEqual(respRaw);
  });

  test("it throws an error when length is not a number", () => {
    expect.assertions(2);
    const arrayRaw: Buffer = Buffer.from("*test\r\n");

    try {
      parseCommandBuffer(arrayRaw);
    } catch (er) {
      const error = er as CustomError;
      expect(error).toBeInstanceOf(CustomError);
      expect(error.kind).toBe(RESPErrorKind.ARRAY_DECLARED_LENGTH_WRONG);
    }
  });

  test("it throws an error when length is negative other than -1", () => {
    expect.assertions(2);
    const arrayRaw: Buffer = Buffer.from("*-10\r\n");

    try {
      parseCommandBuffer(arrayRaw);
    } catch (er) {
      const error = er as CustomError;
      expect(error).toBeInstanceOf(CustomError);
      expect(error.kind).toBe(RESPErrorKind.ARRAY_DECLARED_LENGTH_WRONG);
    }
  });

  test("it throws an error on invalid carriage return in last element", () => {
    expect.assertions(2);
    const arrayRaw: Buffer = Buffer.from("*2\r\n:123\r\n-Error message\n");

    try {
      parseCommandBuffer(arrayRaw);
    } catch (er) {
      const error = er as CustomError;
      expect(error).toBeInstanceOf(CustomError);
      expect(error.kind).toBe(RESPErrorKind.INVALID_CARRIAGE_RETURN);
    }
  });

  test("it throws an error on invalid carriage return inside of array", () => {
    expect.assertions(2);
    const arrayRaw: Buffer = Buffer.from("*2\r\n:123\n-Error message\r\n");

    try {
      parseCommandBuffer(arrayRaw);
    } catch (er) {
      const error = er as CustomError;
      expect(error).toBeInstanceOf(CustomError);
      expect(error.kind).toBe(RESPErrorKind.INVALID_CARRIAGE_RETURN);
    }
  });
});

describe("Simple string parser", () => {
  const respType: RESPType = RESPType.SIMPLE_STRING;

  test("it parses simple string buffer", () => {
    const respRaw: Buffer = Buffer.from("+OK\r\n");
    const respData: string = "OK";

    const result: RESP[] = parseCommandBuffer(respRaw);

    expect(result.length).toBe(1);
    expect(result[0].type).toBe(respType);
    expect(result[0].data).toBe(respData);
    expect(result[0].raw).toStrictEqual(respRaw);
  });

  test("it throws an error on invalid carriage return", () => {
    expect.assertions(2);
    const respRaw: Buffer = Buffer.from("+OK\r");

    try {
      parseCommandBuffer(respRaw);
    } catch (er) {
      const error = er as CustomError;
      expect(error).toBeInstanceOf(CustomError);
      expect(error.kind).toBe(RESPErrorKind.INVALID_CARRIAGE_RETURN);
    }
  });

  test("it throws an error if data contains carriage return", () => {
    expect.assertions(2);
    const respRaw: Buffer = Buffer.from("+\r\r\n");

    try {
      parseCommandBuffer(respRaw);
    } catch (er) {
      const error = er as CustomError;
      expect(error).toBeInstanceOf(CustomError);
      expect(error.kind).toBe(RESPErrorKind.INVALID_CARRIAGE_RETURN);
    }
  });
});
