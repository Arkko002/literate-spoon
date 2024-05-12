import { describe, expect, test } from "@jest/globals";
import { RESP, RESPType, parseCommandBuffer } from ".";

describe("RESP module", () => {
  test("should parse simple string buffer", () => {
    const respRaw: Buffer = Buffer.from("+OK\r\n");
    const respData: string = "OK";
    const respType: RESPType = RESPType.SIMPLE_STRING;

    const result: RESP<string>[] = parseCommandBuffer(respRaw);

    expect(result.length).toBe(1);
    expect(result[0].type).toBe(respType);
    expect(result[0].data).toBe(respData);
    expect(result[0].raw).toStrictEqual(respRaw);
  });

  test("should parse error buffer", () => {
    const respRaw: Buffer = Buffer.from("-Error message\r\n");
    const respData: string = "Error message";
    const respType: RESPType = RESPType.ERROR;

    const result: RESP<string>[] = parseCommandBuffer(respRaw);

    expect(result.length).toBe(1);
    expect(result[0].type).toBe(respType);
    expect(result[0].data).toBe(respData);
    expect(result[0].raw).toStrictEqual(respRaw);
  });

  test("should parse integer buffer", () => {
    const respRaw: Buffer = Buffer.from(":123\r\n");
    const respData: number = 123;
    const respType: RESPType = RESPType.INTEGER;

    const result: RESP<number>[] = parseCommandBuffer(respRaw);

    expect(result.length).toBe(1);
    expect(result[0].type).toBe(respType);
    expect(result[0].data).toBe(respData);
  });

  test("should parse bulk string buffer", () => {
    const respRaw: Buffer = Buffer.from("$5\r\nhello\r\n");
    const respData: string = "hello";
    const respType: RESPType = RESPType.BULK_STRING;

    const result: RESP<string>[] = parseCommandBuffer(respRaw);

    expect(result.length).toBe(1);
    expect(result[0].type).toBe(respType);
    expect(result[0].data).toBe(respData);
    expect(result[0].raw).toStrictEqual(respRaw);
  });

  test("should parse array buffer", () => {
    const arrayRaw: Buffer = Buffer.from(
      "*4\r\n$5\r\nhello\r\n+world\r\n:123\r\n-Error message\r\n",
    );
    const arrayType: RESPType = RESPType.ARRAY;

    const bulkStringRaw: Buffer = Buffer.from("$5\r\nhello\r\n");
    const bulkStringType: RESPType = RESPType.BULK_STRING;

    const simpleStringRaw: Buffer = Buffer.from("+world\r\n");
    const simpleStringType: RESPType = RESPType.SIMPLE_STRING;

    const integerRaw: Buffer = Buffer.from(":123\r\n");
    const integerType: RESPType = RESPType.INTEGER;

    const errorRaw: Buffer = Buffer.from("-Error message\r\n");
    const errorType: RESPType = RESPType.ERROR;

    const respArrayData: RESP<any>[] = [
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
});
