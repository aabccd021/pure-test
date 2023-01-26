import type { Change } from '.';

export type SerializationError = {
  readonly code: 'SerializationError';
  readonly path: readonly (number | string)[];
};

export const serializationError = (path: readonly (number | string)[]): SerializationError => ({
  code: 'SerializationError' as const,
  path,
});

export type AssertionError = {
  readonly code: 'AssertionError';
  readonly changes: readonly Change[];
  readonly received: unknown;
  readonly expected: unknown;
};

export const assertionError = (p: Omit<AssertionError, 'code'>): AssertionError => ({
  ...p,
  code: 'AssertionError',
});

export type TimedOut = { readonly code: 'TimedOut' };

export const timedOut: TimedOut = { code: 'TimedOut' };

export type UnhandledException = {
  readonly code: 'UnhandledException';
  readonly exception: {
    readonly value: unknown;
    readonly serialized: unknown;
  };
};

export const unhandledException = (exception: {
  readonly value: unknown;
  readonly serialized: unknown;
}): UnhandledException => ({
  code: 'UnhandledException' as const,
  exception,
});

export type Union = AssertionError | SerializationError | TimedOut | UnhandledException;
