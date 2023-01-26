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
import type * as TestUnitError from './testUnitError';
import * as testUnitError from './testUnitError';
import type * as TestUnitSuccess from './testUnitSuccess';
import * as testUnitSuccess from './testUnitSuccess';

const { summon } = summonFor({});

export type { Assert, Named, ShardingError, SuiteError, TestUnit, TestUnitError, TestUnitSuccess };

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

export { named, shardingError, suiteError, testUnitError, testUnitSuccess };

export const TestSuccess = summon((F) =>
  F.interface(
    {
      timeElapsedMs: F.number(),
    },
    'TestSuccess'
  )
);

export type TestSuccess = AType<typeof TestSuccess>;

export type TestResult = Either<TestError['Union'], TestSuccess>;

export type TestUnitResult = Either<Named<TestUnitError.Union>, Named<TestUnitSuccess.Union>>;

export type SuiteResult = Either<SuiteError.Union, readonly Named<TestUnitSuccess.Union>[]>;

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
