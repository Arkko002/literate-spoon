import { RedosError } from "./error";
import { Result } from "./result";
import { Option } from "./option";

// TODO:
export interface MatchResult<T, E extends RedosError> {
  match<R>(
    this: Result<T, E>,
    handlers: {
      Ok: (value: T) => R;
      Err: (error: E) => R;
    },
  ): R;
}

export interface MatchOption<T> {
  match<R>(
    this: Option<T>,
    handlers: {
      Some: (value: T) => R;
      None: () => R;
    },
  ): R;
}
