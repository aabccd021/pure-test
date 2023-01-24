import type { Change } from '.';

export type SerializationError = {
  readonly code: 'SerializationError';
  readonly path: readonly (number | string)[];
};

export type Union =
  | SerializationError
  | {
      readonly code: 'AssertionError';
      readonly changes: readonly Change[];
      readonly received: unknown;
      readonly expected: unknown;
    }
  | { readonly code: 'TimedOut' }
  | { readonly code: 'UnexpectedLeft'; readonly value: unknown }
  | { readonly code: 'UnexpectedNone' }
  | { readonly code: 'UnexpectedRight'; readonly value: unknown }
  | { readonly code: 'UnhandledException'; readonly exception: unknown };
