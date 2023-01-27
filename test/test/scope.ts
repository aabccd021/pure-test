import type { Named, TestUnitSuccess } from '@src';
import { assert, runTests, scope, test } from '@src';
import { readonlyArray, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { DeepPartial } from 'ts-essentials';

type TestCase = {
  readonly name: string;
  readonly scope1Name: string;
  readonly scope2Name: string;
  readonly result: readonly DeepPartial<Named<TestUnitSuccess>>[];
};

const caseToTest = (tc: TestCase) =>
  test({
    name: tc.name,
    act: pipe(
      scope({
        [tc.scope1Name]: {
          tests: [
            test({ name: 'one', act: pipe('foo', assert.equal('foo'), task.of) }),
            test({ name: 'two', act: pipe('foo', assert.equal('foo'), task.of) }),
          ],
        },
        [tc.scope2Name]: {
          tests: [
            test({ name: 'three', act: pipe('foo', assert.equal('foo'), task.of) }),
            test({ name: 'four', act: pipe('foo', assert.equal('foo'), task.of) }),
          ],
        },
      }),
      taskEither.right,
      runTests({}),
      assert.taskEither(assert.equalDeepPartial(tc.result))
    ),
  });

const cases: readonly TestCase[] = [
  {
    name: 'foo bar',
    scope1Name: 'foo',
    scope2Name: 'bar',
    result: [
      { name: 'foo > one' },
      { name: 'foo > two' },
      { name: 'bar > three' },
      { name: 'bar > four' },
    ],
  },
  {
    name: 'hoge baz',
    scope1Name: 'hoge',
    scope2Name: 'baz',
    result: [
      { name: 'hoge > one' },
      { name: 'hoge > two' },
      { name: 'baz > three' },
      { name: 'baz > four' },
    ],
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
