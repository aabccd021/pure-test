import type { Change, SuiteError } from '@src';
import { assert, runTests, test } from '@src';
import { either, readonlyArray, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

type Case = {
  readonly name: string;
  readonly expected: unknown;
  readonly received: unknown;
  readonly changes: readonly Change[];
};

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(
      taskEither.right([
        test({
          name: 'either fails',
          act: pipe(
            either.left<unknown, unknown>('foo'),
            assert.either(assert.equal(tc.expected)),
            task.of
          ),
        }),
      ]),
      runTests({}),
      assert.taskEitherLeft(
        assert.equal<SuiteError>({
          code: 'TestRunError',
          results: [
            either.left({
              name: 'either fails',
              value: {
                code: 'TestError',
                value: {
                  code: 'AssertionError',
                  received: either.left('foo'),
                  expected: { _tag: 'Right' },
                  changes: tc.changes,
                },
              },
            }),
          ],
        })
      )
    ),
  });

const cases: readonly Case[] = [
  {
    name: 'string',
    expected: 'foo',
    received: { minus: 'minusValue' },
    changes: [
      { type: '0', value: `{` },
      { type: '-', value: `  "_tag": "Right",` },
      { type: '+', value: `  "_tag": "Left",` },
      { type: '+', value: `  "left": "foo",` },
      { type: '0', value: `}` },
    ],
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
