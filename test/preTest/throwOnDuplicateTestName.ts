import type { SuiteResult } from '@src';
import { assert, preTest, runTests, test } from '@src';
import { either, readonlyArray, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { DeepPartial } from 'ts-essentials';

type Case = {
  readonly name: string;
  readonly test1Name: string;
  readonly test2Name: string;
  readonly result: DeepPartial<SuiteResult>;
};

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(
      taskEither.right([
        test({ name: tc.test1Name, act: pipe('foo', assert.equal('foo'), task.of) }),
        test({ name: tc.test2Name, act: pipe('foo', assert.equal('foo'), task.of) }),
      ]),
      preTest.throwOnDuplicateTestName,
      runTests({}),
      assert.task(assert.equalDeepPartial(tc.result))
    ),
  });

const cases: readonly Case[] = [
  {
    name: 'throws on duplicate test names',
    test1Name: 'foo test',
    test2Name: 'foo test',
    result: either.left({ code: 'DuplicateTestName', name: 'foo test' }),
  },

  {
    name: 'does not throws on unique test names',
    test1Name: 'foo test',
    test2Name: 'bar test',
    result: either.right([{ name: 'foo test' }, { name: 'bar test' }]),
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
