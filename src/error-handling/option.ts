import { RedosError } from "./error";

export interface SomeType<T> {
  type: "some";
  value: T;
  unwrap(): T;
  unwrapOr(defaultValue: T): T;
  unwrapOrElse(fn: () => T): T;
  isSome(this: Option<T>): this is SomeType<T>;
  isNone(this: Option<T>): this is NoneType;
}

export interface NoneType {
  type: "none";
  unwrap(): never;
  unwrapOr<T>(defaultValue: T): T;
  unwrapOrElse<T>(fn: () => T): T;
  isSome<T>(this: Option<T>): this is SomeType<T>;
  isNone<T>(this: Option<T>): this is NoneType;
}

export type Option<T> = SomeType<T> | NoneType;

export function Some<T>(value: T): Option<T> {
  return {
    type: "some",
    value,
    unwrap: () => value,
    unwrapOr: () => value,
    unwrapOrElse: () => value,
    isSome: () => true,
    isNone: () => false,
  };
}

export const None: Option<never> = Object.freeze({
  type: "none",
  unwrap: () => {
    throw new RedosError(
      "Cannot unwrap None",
      OptionErrorKind.CANNOT_UNWRAP_NONE,
    );
  },
  unwrapOr: <T>(defaultValue: T) => defaultValue,
  unwrapOrElse: <T>(fn: () => T) => fn(),
  isSome: () => false,
  isNone: () => true,
});

export enum OptionErrorKind {
  CANNOT_UNWRAP_NONE,
}
