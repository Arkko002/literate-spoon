// TODO: Apply builder pattern here
const createArray = (data: string[]): string =>
  `*${data.length}\r\n${data.join("\r\n")}`;

const createBulkString = (data: string): string => `$${data.length}\r\n${data}`;

const createSimpleString = (data: string): string => `+${data}\r\n`;

const createError = (data: string): string => `-${data}\r\n`;

const createInteger = (data: number): string => `:${data}\r\n`;
