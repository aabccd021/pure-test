import { assert, test } from '@src';
import { readonlyArray, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import { match } from 'ts-pattern';

type TestCase = {
  readonly name: string;
  readonly scope1Name: string;
  readonly scope2Name: string;
  readonly testNames: readonly string[];
};

const caseToTest = (tc: TestCase) =>
  test.single({
    name: tc.name,
    act: pipe(
      test.scope({
        [tc.scope1Name]: {
          tests: [
            test.single({
              name: 'one',
              act: pipe('foo', assert.equal('foo'), task.of),
            }),
            test.single({
              name: 'two',
              act: pipe('foo', assert.equal('foo'), task.of),
            }),
          ],
        },
        [tc.scope2Name]: {
          tests: [
            test.single({
              name: 'three',
              act: pipe('foo', assert.equal('foo'), task.of),
            }),
            test.single({
              name: 'four',
              act: pipe('foo', assert.equal('foo'), task.of),
            }),
          ],
        },
      }),
      readonlyArray.map((t) =>
        match(t)
          .with({ type: 'single' }, ({ assert: { name } }) => name)
          .with({ type: 'group' }, ({ name }) => name)
          .exhaustive()
      ),
      assert.equalArray(tc.testNames),
      task.of
    ),
  });

const cases: readonly TestCase[] = [
  {
    name: 'foo bar',
    scope1Name: 'foo',
    scope2Name: 'bar',
    testNames: ['foo > one', 'foo > two', 'bar > three', 'bar > four'],
  },
  {
    name: 'hoge baz',
    scope1Name: 'hoge',
    scope2Name: 'baz',
    testNames: ['hoge > one', 'hoge > two', 'baz > three', 'baz > four'],
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
