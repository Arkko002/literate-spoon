export class RESPError extends Error {
  constructor(
    public message: string,
    public kind: RESPErrorKind,
  ) {
    super(message);
  }
}

export enum RESPErrorKind {
  INVALID_CARRIAGE_RETURN,
  INVALID_RESP_TYPE,
  STRING_WITH_CARRIAGE_RETURN,
  INTEGER_EMPTY,
  INTEGER_NOT_NUMBER,
  BULK_STRING_NOT_ENOUGH_DATA,
  BULK_STRING_DECLARED_LENGTH_WRONG,
  ARRAY_DECLARED_LENGTH_WRONG,
}
