import { readonlyArray, readonlyRecord, string } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { Ord } from 'fp-ts/Ord';
import type { ReadonlyRecord } from 'fp-ts/ReadonlyRecord';
import { modify } from 'spectacles-ts';
import { match } from 'ts-pattern';

import type { Assertion, GroupTest, SingleTest, Test } from './type';

export const single = ({ todo, ...assert }: Assertion & { readonly todo?: true }): SingleTest => ({
  type: 'single',
  todo,
  assert,
});

export const group = (g: Omit<GroupTest, 'type'>): GroupTest => ({ ...g, type: 'group' });

const keepOrd: Ord<string> = { compare: () => 1, equals: string.Eq.equals };

export const scope: (
  ts: ReadonlyRecord<string, { readonly tests: readonly Test[] }>
) => readonly Test[] = readonlyRecord.foldMapWithIndex(keepOrd)(readonlyArray.getMonoid<Test>())(
  (idx, val) =>
    pipe(
      val.tests,
      readonlyArray.map((testOrGroup) =>
        match(testOrGroup)
          .with({ type: 'single' }, (singleTest) =>
            pipe(
              singleTest,
              modify('assert.name', (name) => `${idx} > ${name}`)
            )
          )
          .with({ type: 'group' }, (groupTest) =>
            pipe(
              groupTest,
              modify('name', (name) => `${idx} > ${name}`)
            )
          )
          .exhaustive()
      )
    )
);
