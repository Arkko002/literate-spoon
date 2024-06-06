import { Err, Ok, RedosError, Result } from "../error-handling";

// TODO: Typing for values stored in db
export interface IDatbase {
  get(key: string): Result<any, RedosError>;
  set(key: string, value: string): Result<null, RedosError>;
}

// NOTE: https://github.com/redis/redis/blob/unstable/src/db.c#L75
class Database implements IDatbase {
  private static _instance: Database;
  private values: Map<string, any> = new Map();

  private constructor() {}

  public static get Instance() {
    return this._instance || (this._instance = new Database());
  }

  public get(key: string): Result<any, RedosError> {
    const value: string | undefined = this.values.get(key);
    if (value) {
      return Ok(value);
    }

    return Err(
      new RedosError(
        `Key not found in storage: ${key}`,
        DatabaseErrorKind.KEY_NOT_IN_STORAGE,
      ),
    );
  }

  // TODO: Options, TTL, flags
  public set(key: string, value: string): Result<null, RedosError> {
    // TODO: Set overwrite flag
    if (this.values.has(key)) {
      return Err(
        new RedosError(
          `Key already exists in storage: ${key}`,
          DatabaseErrorKind.CANNOT_OVERWRITE_KEY,
        ),
      );
    }

    this.values.set(key, value);
    return Ok(null);
  }
}

export enum DatabaseErrorKind {
  KEY_NOT_IN_STORAGE,
  CANNOT_OVERWRITE_KEY,
}

const database: Database = Database.Instance;

export default database;
