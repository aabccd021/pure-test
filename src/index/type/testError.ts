import type { Change } from '.';

export type SerializationError = {
  readonly code: 'SerializationError';
  readonly path: readonly (number | string)[];
  readonly forceSerializedValue: string;
};

export const serializationError = (p: Omit<SerializationError, 'code'>): SerializationError => ({
  ...p,
  code: 'SerializationError' as const,
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

type SerializedException = {
  readonly value: unknown;
  readonly serialized: unknown;
};

export type UnhandledException = {
  readonly code: 'UnhandledException';
  readonly exception: SerializedException;
};

export const unhandledException = (exception: SerializedException): UnhandledException => ({
  code: 'UnhandledException' as const,
  exception,
});

export type Union = AssertionError | SerializationError | TimedOut | UnhandledException;
