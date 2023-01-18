import { either, ioRef, readonlyArray, string, task, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';

import { logErrorsF, runTests, test } from '../src';
import { testW } from '../src/test';

type Case = {
  readonly name: string;
  readonly actual: unknown;
  readonly expected: unknown;
  readonly log: readonly string[];
};

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(
      task.Do,
      task.bind('logsRef', () => task.fromIO(ioRef.newIORef<unknown>(undefined))),
      task.bind('env', ({ logsRef }) => task.of({ console: { log: logsRef.write } })),
      task.chainFirst(({ env }) =>
        pipe(
          [
            testW({
              name: 'foo',
              act: task.of(tc.actual),
              assert: tc.expected,
            }),
          ],
          runTests({}),
          logErrorsF(env)
        )
      ),
      task.chainIOK(({ logsRef }) => logsRef.read),
      task.map(either.fromPredicate(string.isString, () => 'not a string')),
      taskEither.map(
        flow(
          string.split('\n'),
          readonlyArray.dropLeft(1),
          readonlyArray.dropRight(1),
          readonlyArray.map(
            flow(
              string.split(''),
              readonlyArray.dropLeft(2),
              readonlyArray.intercalate(string.Monoid)('')
            )
          )
        )
      )
    ),
    assert: either.right(tc.log),
  });

const cases: readonly Case[] = [
  {
    name: 'minus diff is logged with minus(-) prefix and red(31) color',
    actual: { minus: 'minusValue' },
    expected: {},
    log: [
      `\x1b[32m- {}\x1b[39m`,
      `\x1b[31m+ {\x1b[39m`,
      `\x1b[31m+   "minus": "minusValue"\x1b[39m`,
      `\x1b[31m+ }\x1b[39m`,
    ],
  },

  {
    name: 'plus diff is logged with plus(+) prefix and green(32) color',
    actual: {},
    expected: { plus: 'plusValue' },
    log: [
      `\x1b[32m- {\x1b[39m`,
      `\x1b[32m-   "plus": "plusValue"\x1b[39m`,
      `\x1b[32m- }\x1b[39m`,
      `\x1b[31m+ {}\x1b[39m`,
    ],
  },

  {
    name: 'can use undefined in actual',
    actual: { minus: 'minusValue' },
    expected: undefined,
    log: [
      `\x1b[32m- undefined\x1b[39m`,
      `\x1b[31m+ {\x1b[39m`,
      `\x1b[31m+   "minus": "minusValue"\x1b[39m`,
      `\x1b[31m+ }\x1b[39m`,
    ],
  },

  {
    name: 'can use undefined in expected',
    actual: undefined,
    expected: { plus: 'plusValue' },
    log: [
      `\x1b[32m- {\x1b[39m`,
      `\x1b[32m-   "plus": "plusValue"\x1b[39m`,
      `\x1b[32m- }\x1b[39m`,
      `\x1b[31m+ undefined\x1b[39m`,
    ],
  },

  {
    name: 'can use undefined in actual',
    actual: { minus: 'minusValue' },
    expected: undefined,
    log: [
      `\x1b[32m- undefined\x1b[39m`,
      `\x1b[31m+ {\x1b[39m`,
      `\x1b[31m+   "minus": "minusValue"\x1b[39m`,
      `\x1b[31m+ }\x1b[39m`,
    ],
  },

  {
    name: 'can use undefined in expected',
    actual: undefined,
    expected: { plus: 'plusValue' },
    log: [
      `\x1b[32m- {\x1b[39m`,
      `\x1b[32m-   "plus": "plusValue"\x1b[39m`,
      `\x1b[32m- }\x1b[39m`,
      `\x1b[31m+ undefined\x1b[39m`,
    ],
  },

  {
    name: 'can differentiate actual undefined and expected string "undefined"',
    actual: 'undefined',
    expected: undefined,
    log: [`\x1b[32m- undefined\x1b[39m`, `\x1b[31m+ "undefined"\x1b[39m`],
  },

  {
    name: 'can differentiate actual string "undefined" and expected undefined',
    actual: undefined,
    expected: 'undefined',
    log: [`\x1b[32m- "undefined"\x1b[39m`, `\x1b[31m+ undefined\x1b[39m`],
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
