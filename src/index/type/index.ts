import { summonFor } from '@morphic-ts/batteries/lib/summoner-ESBST';
// eslint-disable-next-line import/no-unassigned-import
import type {} from '@morphic-ts/model-algebras/lib/types';
import type { AType } from '@morphic-ts/summoners';
import type { Either } from 'fp-ts/Either';
import type { TaskEither } from 'fp-ts/TaskEither';
import type { TypeOf } from 'make-union-morphic-ts';
import { makeUnion } from 'make-union-morphic-ts';

import type * as Assert from './assert';
import type { Named } from './named';
import * as named from './named';
import type * as ShardingError from './shardingError';
import * as shardingError from './shardingError';
import type * as SuiteError from './suiteError';
import * as suiteError from './suiteError';
import type * as TestUnit from './testUnit';

type AppEnv = object;

const { summon } = summonFor<AppEnv>({});

export type { Assert, Named, ShardingError, SuiteError, TestUnit };

export { named, shardingError, suiteError };

export const Change = summon((F) =>
  F.interface(
    {
      type: F.keysOf({
        '-': null,
        '+': null,
        '0': null,
      }),
      value: F.string(),
    },
    'Change'
  )
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
      'SerializationError'
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
      'AssertionError'
    )
  ),
  TimedOut: summon((F) =>
    F.interface(
      {
        code: F.stringLiteral('TimedOut'),
      },
      'TimedOut'
    )
  ),
  UnhandledException: summon((F) =>
    F.interface(
      {
        code: F.stringLiteral('UnhandledException'),
        exception: F.interface(
          {
            value: F.unknown(),
            serialized: F.unknown(),
          },
          'UnhandledException.exception'
        ),
      },
      'UnhandledException'
    )
  ),
});

export type TestError = TypeOf<typeof TestError>;

export const TestSuccess = summon((F) =>
  F.interface(
    {
      timeElapsedMs: F.number(),
    },
    'TestSuccess'
  )
);

export type TestSuccess = AType<typeof TestSuccess>;

export const TestResult = summon((F) => F.either(TestError.Union(F), TestSuccess(F)));

export type TestResult = AType<typeof TestResult>;

export const TestUnitSuccess = makeUnion(summon)('unit')({
  Test: summon((F) =>
    F.interface(
      {
        unit: F.stringLiteral('Test'),
        value: TestSuccess(F),
      },
      'Test'
    )
  ),
  Group: summon((F) =>
    F.interface(
      {
        unit: F.stringLiteral('Group'),
        results: F.array(
          F.interface(
            {
              name: F.string(),
              value: TestSuccess(F),
            },
            'Group.results'
          )
        ),
      },
      'Group'
    )
  ),
});

export type TestUnitSuccess = TypeOf<typeof TestUnitSuccess>;

export const TestUnitError = makeUnion(summon)('code')({
  TestError: summon((F) =>
    F.interface(
      {
        code: F.stringLiteral('TestError'),
        value: TestError.Union(F),
      },
      'TestError'
    )
  ),
  GroupError: summon((F) =>
    F.interface(
      {
        code: F.stringLiteral('GroupError'),
        results: F.array(
          F.either(
            F.interface(
              {
                name: F.string(),
                value: TestError.Union(F),
              },
              'Group.results'
            ),
            F.interface(
              {
                name: F.string(),
                value: TestSuccess(F),
              },
              'Group.results'
            )
          )
        ),
      },
      'GroupError'
    )
  ),
});

export type TestUnitError = TypeOf<typeof TestUnitError>;

export type TestUnitResult = Either<Named<TestUnitError['Union']>, Named<TestUnitSuccess['Union']>>;

export type SuiteResult = Either<SuiteError.Union, readonly Named<TestUnitSuccess['Union']>[]>;

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
  ShardingError.ShardingStrategyError,
  readonly (readonly Named<TestUnit.Union>[])[]
>;

export type GetShardIndex = TaskEither<ShardingError.GetShardIndexError, number>;

export type GetShardCount = TaskEither<ShardingError.GetShardCountError, number>;
