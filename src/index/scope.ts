import type { Named, TestUnit } from '@src';
import { readonlyArray, readonlyRecord, string } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { Ord } from 'fp-ts/Ord';
import type { ReadonlyRecord } from 'fp-ts/ReadonlyRecord';
import { modify } from 'spectacles-ts';

const keepOrd: Ord<string> = { compare: () => 1, equals: string.Eq.equals };

export const scope: (
  ts: ReadonlyRecord<string, { readonly tests: readonly Named<TestUnit>[] }>
) => readonly Named<TestUnit>[] = readonlyRecord.foldMapWithIndex(keepOrd)(
  readonlyArray.getMonoid<Named<TestUnit>>()
)((idx, val) =>
  pipe(
    val.tests,
    readonlyArray.map((test) =>
      pipe(
        test,
        modify('name', (name) => `${idx} > ${name}`)
      )
    )
  )
);
