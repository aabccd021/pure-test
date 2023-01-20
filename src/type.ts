import type { Either } from 'fp-ts/Either';
import type { Task } from 'fp-ts/Task';
import type * as retry from 'retry-ts';

export type AssertEqual = {
  readonly type: 'AssertEqual';
  readonly expected: unknown;
  readonly actual: unknown;
};

export type EitherLeft = {
  readonly type: 'EitherLeft';
  readonly left: unknown;
};

export type Assert = AssertEqual | EitherLeft;

export type Concurrency =
  | { readonly type: 'parallel' }
  | { readonly type: 'sequential'; readonly failFast?: false };

export type Assertion = {
  readonly name: string;
  readonly act: Task<Assert>;
  readonly timeout?: number;
  readonly retry?: retry.RetryPolicy;
};

export type Test = {
  readonly type: 'test';
  readonly todo?: true;
  readonly assert: Assertion;
};

export const test = ({ todo, ...assert }: Assertion & { readonly todo?: true }): Test => ({
  type: 'test',
  todo,
  assert,
});

export type Group = {
  readonly type: 'group';
  readonly name: string;
  readonly todo?: true;
  readonly concurrency?: Concurrency;
  readonly asserts: readonly Assertion[];
};

export const group = (g: Omit<Group, 'type'>): Group => ({
  ...g,
  type: 'group',
});

export type TestOrGroup = Group | Test;

export type TestConfig = {
  readonly concurrency?: Concurrency;
};

export type Change = {
  readonly type: '-' | '+' | '0';
  readonly value: string;
};

export type DiffLines = (p: {
  readonly expected: string;
  readonly actual: string;
}) => readonly Change[];

export type SerializationError = {
  readonly code: 'SerializationError';
  readonly path: readonly (number | string)[];
};

export type AssertionError =
  | SerializationError
  | {
      readonly code: 'AssertionError';
      readonly diff: readonly Change[];
      readonly actual: unknown;
      readonly expected: unknown;
    }
  | {
      readonly code: 'EitherLeft';
    }
  | {
      readonly code: 'Skipped';
    }
  | {
      readonly code: 'timed out';
    }
  | {
      readonly code: 'unhandled exception';
      readonly exception: unknown;
    };

export type AssertionFailResult = {
  readonly name: string;
  readonly error: AssertionError;
};

export type AssertionPassResult = {
  readonly name: string;
};

export type AssertionResult = Either<AssertionFailResult, AssertionPassResult>;

export type TestError =
  | AssertionError
  | {
      readonly code: 'MultipleAssertionError';
      readonly results: readonly AssertionResult[];
    };

export type TestFailResult = {
  readonly name: string;
  readonly error: TestError;
};

export type TestPassResult = {
  readonly name: string;
};

export type TestResult = Either<TestFailResult, TestPassResult>;

export type SuiteError =
  | {
      readonly type: 'DuplicateTestName';
      readonly name: string;
    }
  | {
      readonly type: 'TestError';
      readonly results: readonly TestResult[];
    };

export type SuiteResult = Either<SuiteError, readonly TestPassResult[]>;
