import { summonFor } from '@morphic-ts/batteries/lib/summoner-ESBST';
// eslint-disable-next-line import/no-unassigned-import
import type {} from '@morphic-ts/model-algebras/lib/types';
import type { AType } from '@morphic-ts/summoners';
import type { TaskEither } from 'fp-ts/TaskEither';
import type { TypeOf } from 'make-union-morphic-ts';
import { makeUnion } from 'make-union-morphic-ts';

import type * as Assert from './assert';
import type * as TestUnit from './testUnit';

type AppEnv = object;

const { summon } = summonFor<AppEnv>({});

export type { Assert, TestUnit };

export type Named<T> = {
  readonly name: string;
  readonly value: T;
};

export const Change = summon((F) =>
  F.interface({ type: F.keysOf({ '-': null, '+': null, '0': null }), value: F.string() }, '')
);

export type Change = AType<typeof Change>;

export const TestError = makeUnion(summon)('code')({
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
        exception: F.interface(
          { value: F.unknown(), serialized: F.unknown() },
          'UnhandledException.exception'
        ),
      },
      ''
    )
  ),
});

export type TestError = TypeOf<typeof TestError>;

export const TestSuccess = summon((F) => F.interface({ timeElapsedMs: F.number() }, ''));

export type TestSuccess = AType<typeof TestSuccess>;

export const TestResult = summon((F) => F.either(TestError.Union(F), TestSuccess(F)));

export type TestResult = AType<typeof TestResult>;

export const TestUnitSuccess = makeUnion(summon)('unit')({
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

export type TestUnitSuccess = TypeOf<typeof TestUnitSuccess>;

export const TestUnitError = makeUnion(summon)('code')({
  TestError: summon((F) =>
    F.interface({ code: F.stringLiteral('TestError'), value: TestError.Union(F) }, '')
  ),
  GroupError: summon((F) =>
    F.interface(
      {
        code: F.stringLiteral('GroupError'),
        results: F.array(
          F.either(
            F.interface({ name: F.string(), value: TestError.Union(F) }, ''),
            F.interface({ name: F.string(), value: TestSuccess(F) }, '')
          )
        ),
      },
      ''
    )
  ),
});

export type TestUnitError = TypeOf<typeof TestUnitError>;

export const TestUnitResult = summon((F) =>
  F.either(
    F.interface({ name: F.string(), value: TestUnitError.Union(F) }, ''),
    F.interface({ name: F.string(), value: TestUnitSuccess.Union(F) }, '')
  )
);

export type TestUnitResult = AType<typeof TestUnitResult>;

export const ShardingError = makeUnion(summon)('code')({
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

export type ShardingError = TypeOf<typeof ShardingError>;

export const SuiteError = makeUnion(summon)('code')({
  DuplicateTestName: summon((F) =>
    F.interface({ code: F.stringLiteral('DuplicateTestName'), name: F.string() }, '')
  ),
  ShardingError: summon((F) =>
    F.interface({ code: F.stringLiteral('ShardingError'), value: ShardingError.Union(F) }, '')
  ),
  TestRunError: summon((F) =>
    F.interface({ code: F.stringLiteral('TestRunError'), results: F.array(TestUnitResult(F)) }, '')
  ),
});

export type SuiteError = TypeOf<typeof SuiteError>;

export const SuiteResult = summon((F) =>
  F.either(
    SuiteError.Union(F),
    F.array(F.interface({ name: F.string(), value: TestUnitSuccess.Union(F) }, ''))
  )
);

export type SuiteResult = AType<typeof SuiteResult>;

export type ConcurrencyConfig =
  | { readonly type: 'parallel' }
  | { readonly type: 'sequential'; readonly failFast: boolean };

export type TestConfig = { readonly concurrency: ConcurrencyConfig };

export type DiffLines = (p: {
  readonly expected: string;
  readonly received: string;
}) => readonly Change[];

export type ShardingStrategy = (p: {
  readonly shardCount: number;
  readonly tests: readonly Named<TestUnit.Union>[];
}) => TaskEither<
  ShardingError['ShardingStrategyError'],
  readonly (readonly Named<TestUnit.Union>[])[]
>;

export type GetShardIndex = TaskEither<
  ShardingError['ShardIndexIsNotANumber'] | ShardingError['ShardIndexIsUnspecified'],
  number
>;

export type GetShardCount = TaskEither<
  ShardingError['ShardCountIsNotANumber'] | ShardingError['ShardCountIsUnspecified'],
  number
>;
