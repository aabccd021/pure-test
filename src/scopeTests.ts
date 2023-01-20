import { readonlyArray, readonlyRecord, string } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { ReadonlyRecord } from 'fp-ts/ReadonlyRecord';
import { match } from 'ts-pattern';

import type { TestOrGroup } from './type';

export const scopeTests: (
  ts: ReadonlyRecord<string, { readonly tests: readonly TestOrGroup[] }>
) => readonly TestOrGroup[] = readonlyRecord.foldMapWithIndex(string.Ord)(
  readonlyArray.getMonoid<TestOrGroup>()
)((idx, val) =>
  pipe(
    val.tests,
    readonlyArray.map((testOrGroup) =>
      match(testOrGroup)
        .with({ type: 'test' }, (test) => ({
          ...test,
          assert: {
            ...test.assert,
            name: `${idx} > ${test.assert.name}`,
          },
        }))
        .with({ type: 'group' }, (group) => ({
          ...group,
          name: `${idx} > ${group.name}`,
        }))
        .exhaustive()
    )
  )
);
