import { RedosError } from "./error";

// TODO: Consider implementing functors like map
// https://sanctuary.js.org/#map
// https://github.com/sanctuary-js/sanctuary-either/blob/v2.1.0/index.js
export interface Left<T, E extends RedosError> {
  type: "error";
  error: E;
  unwrap(): T;
  unwrapOr(defaultValue: T): T;
  unwrapOrElse(fn: (error: E) => T): T;
  isErr(this: Result<T, E>): this is Left<T, E>;
  isOk(this: Result<T, E>): this is Right<T, E>;
}

export interface Right<T, E extends RedosError> {
  type: "ok";
  value: T;
  unwrap(): T;
  unwrapOr(defaultValue: T): T;
  unwrapOrElse(fn: (error: E) => T): T;
  isErr(this: Result<T, E>): this is Left<T, E>;
  isOk(this: Result<T, E>): this is Right<T, E>;
}

export function Ok<T, E extends RedosError>(value: T): Result<T, E> {
  return {
    type: "ok",
    value,
    unwrap: () => value,
    unwrapOr: () => value,
    unwrapOrElse: () => value,
    isErr: () => false,
    isOk: () => true,
  };
}

export function Err<T, E extends RedosError>(error: E): Result<T, E> {
  return {
    type: "error",
    error,
    unwrap: () => {
      throw error;
    },
    unwrapOr: (defaultValue: T) => defaultValue,
    unwrapOrElse: (fn: (error: E) => T) => fn(error),
    isErr: () => true,
    isOk: () => false,
  };
}

export type Result<T, E extends RedosError> = Left<T, E> | Right<T, E>;
