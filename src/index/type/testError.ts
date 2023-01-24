import type { Change } from '.';

export type SerializationError = {
  readonly code: 'SerializationError';
  readonly path: readonly (number | string)[];
};

export type AssertionError = {
  readonly code: 'AssertionError';
  readonly changes: readonly Change[];
  readonly received: unknown;
  readonly expected: unknown;
};

export type TimedOut = { readonly code: 'TimedOut' };

export type UnhandledException = {
  readonly code: 'UnhandledException';
  readonly exception: unknown;
};

export type Union = AssertionError | SerializationError | TimedOut | UnhandledException;
