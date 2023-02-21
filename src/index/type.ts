import { summonFor } from '@morphic-ts/batteries/lib/summoner-ESBST';
// eslint-disable-next-line import/no-unassigned-import
import type {} from '@morphic-ts/model-algebras/lib/types';
import type { AType } from '@morphic-ts/summoners';
import { makeTagged } from '@morphic-ts/summoners';
import type { IO } from 'fp-ts/IO';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import type { TaskOption } from 'fp-ts/TaskOption';
import type { RetryPolicy } from 'retry-ts';

export type AssertEqual = { readonly expected: unknown; readonly received: unknown };

export type Named<T> = { readonly name: string; readonly value: T };

type AppEnv = object;

const { summon } = summonFor<AppEnv>({});

export const ConcurrencyConfig = makeTagged(summon)('type')({
  Parallel: summon((F) => F.interface({ type: F.stringLiteral('Parallel') }, '')),
  Sequential: summon((F) =>
    F.interface({ type: F.stringLiteral('Sequential'), failFast: F.boolean() }, '')
  ),
});

export type ConcurrencyConfig = AType<typeof ConcurrencyConfig>;

export const UnknownRecord = summon((F) => F.record(F.string(), F.unknown()));

export type UnknownRecord = AType<typeof UnknownRecord>;

export const Change = summon((F) =>
  F.interface({ type: F.keysOf({ '-': null, '+': null, '0': null }), value: F.string() }, '')
);

export type Change = AType<typeof Change>;

export const TestError = makeTagged(summon)('code')({
  SerializationError: summon((F) =>
    F.interface(
      {
        code: F.stringLiteral('SerializationError'),
        path: F.array(F.string()),
        forceSerializedValue: F.string(),
      },
      ''
    )
  ),
  AssertionError: summon((F) =>
    F.interface(
      {
        code: F.stringLiteral('AssertionError'),
        changes: F.array(Change(F)),
        received: F.unknown(),
        expected: F.unknown(),
      },
      ''
    )
  ),
  TimedOut: summon((F) => F.interface({ code: F.stringLiteral('TimedOut') }, 'TimedOut')),
  UnhandledException: summon((F) =>
    F.interface(
      {
        code: F.stringLiteral('UnhandledException'),
        exception: F.interface({ value: F.unknown(), serialized: F.unknown() }, ''),
      },
      ''
    )
  ),
});

export type TestError = AType<typeof TestError>;

export const TestSuccess = summon((F) => F.interface({ timeElapsedMs: F.number() }, ''));

export type TestSuccess = AType<typeof TestSuccess>;

export const TestResult = summon((F) => F.either(TestError(F), TestSuccess(F)));

export type TestResult = AType<typeof TestResult>;

export const TestUnitSuccess = makeTagged(summon)('unit')({
  Test: summon((F) => F.interface({ unit: F.stringLiteral('Test'), value: TestSuccess(F) }, '')),
  Group: summon((F) =>
    F.interface(
      {
        unit: F.stringLiteral('Group'),
        results: F.array(F.interface({ name: F.string(), value: TestSuccess(F) }, '')),
      },
      ''
    )
  ),
});

export type TestUnitSuccess = AType<typeof TestUnitSuccess>;

export const TestUnitError = makeTagged(summon)('code')({
  TestError: summon((F) =>
    F.interface({ code: F.stringLiteral('TestError'), value: TestError(F) }, '')
  ),
  GroupError: summon((F) =>
    F.interface(
      {
        code: F.stringLiteral('GroupError'),
        results: F.array(
          F.either(
            F.interface({ name: F.string(), value: TestError(F) }, ''),
            F.interface({ name: F.string(), value: TestSuccess(F) }, '')
          )
        ),
      },
      ''
    )
  ),
});

export type TestUnitError = AType<typeof TestUnitError>;

export const TestUnitResult = summon((F) =>
  F.either(
    F.interface({ name: F.string(), value: TestUnitError(F) }, ''),
    F.interface({ name: F.string(), value: TestUnitSuccess(F) }, '')
  )
);

export type TestUnitResult = AType<typeof TestUnitResult>;

export const ShardingError = makeTagged(summon)('code')({
  ShardIndexOutOfBound: summon((F) =>
    F.interface(
      { code: F.stringLiteral('ShardIndexOutOfBound'), index: F.number(), shardCount: F.number() },
      ''
    )
  ),
  ShardIndexIsUnspecified: summon((F) =>
    F.interface({ code: F.stringLiteral('ShardIndexIsUnspecified') }, '')
  ),
  ShardIndexIsNotANumber: summon((F) =>
    F.interface({ code: F.stringLiteral('ShardIndexIsNotANumber'), value: F.string() }, '')
  ),
  ShardCountIsUnspecified: summon((F) =>
    F.interface({ code: F.stringLiteral('ShardCountIsUnspecified') }, '')
  ),
  ShardCountIsNotANumber: summon((F) =>
    F.interface({ code: F.stringLiteral('ShardCountIsNotANumber'), value: F.string() }, '')
  ),
  ShardingStrategyError: summon((F) =>
    F.interface({ code: F.stringLiteral('ShardingStrategyError') }, '')
  ),
  TestCountChangedAfterSharding: summon((F) =>
    F.interface(
      {
        code: F.stringLiteral('TestCountChangedAfterSharding'),
        testCount: F.interface({ beforeSharding: F.number(), afterSharding: F.number() }, ''),
      },
      ''
    )
  ),
});

export type ShardingError = AType<typeof ShardingError>;

export const SuiteError = makeTagged(summon)('code')({
  DuplicateTestName: summon((F) =>
    F.interface({ code: F.stringLiteral('DuplicateTestName'), name: F.string() }, '')
  ),
  ShardingError: summon((F) =>
    F.interface({ code: F.stringLiteral('ShardingError'), value: ShardingError(F) }, '')
  ),
  TestRunError: summon((F) =>
    F.interface({ code: F.stringLiteral('TestRunError'), results: F.array(TestUnitResult(F)) }, '')
  ),
  WriteResultError: summon((F) =>
    F.interface({ code: F.stringLiteral('WriteResultError'), value: F.unknown() }, '')
  ),
});

export type SuiteError = AType<typeof SuiteError>;

export const SuiteResult = summon((F) =>
  F.either(SuiteError(F), F.array(F.interface({ name: F.string(), value: TestUnitSuccess(F) }, '')))
);

export type SuiteResult = AType<typeof SuiteResult>;

export type Env = {
  readonly writeStringToFile: (p: {
    readonly path: string;
    readonly value: string;
  }) => TaskEither<unknown, unknown>;
  readonly readFileAsString: (p: { readonly path: string }) => TaskEither<unknown, string>;
  readonly getShardCountFromArgs: TaskOption<string>;
  readonly getShardIndexFromArgs: TaskOption<string>;
  readonly exit: (exitCode: number | undefined) => IO<void>;
};

export type TestConfig = { readonly concurrency: ConcurrencyConfig };

export type DiffLines = (p: {
  readonly expected: string;
  readonly received: string;
}) => readonly Change[];

export type GetShardIndex = TaskEither<ShardingError | ShardingError, number>;

export type GetShardCount = TaskEither<ShardingError | ShardingError, number>;

export type Test = {
  readonly unit: 'Test';
  readonly act: Task<AssertEqual>;
  readonly timeout: number;
  readonly retry: RetryPolicy;
};

export type Group = {
  readonly unit: 'Group';
  readonly concurrency: ConcurrencyConfig;
  readonly tests: readonly Named<Test>[];
};

export type TestUnit = Group | Test;

export type ShardingStrategy = (p: {
  readonly shardCount: number;
  readonly tests: readonly Named<TestUnit>[];
}) => TaskEither<ShardingError, readonly (readonly Named<TestUnit>[])[]>;
