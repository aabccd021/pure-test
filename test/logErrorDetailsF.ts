import { ioRef, readonlyArray, string, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import { assert, logErrorDetailsF, runTests, test } from '../src';

const green = '\x1b[32m';
const red = '\x1b[31m';
const colorEnd = '\x1b[39m';

const bold = '\x1b[1m';
const boldEnd = '\x1b[22m';

const invert = '\x1b[7m';
const invertEnd = '\x1b[27m';

type Case = {
  readonly name: string;
  readonly actual: unknown;
  readonly expected: unknown;
  readonly log: readonly string[];
  readonly numPlus: number;
  readonly numMinus: number;
};

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(
      task.fromIO(ioRef.newIORef<string>('')),
      task.chainFirst((logRef) =>
        pipe(
          [
            test({
              name: 'foo',
              act: pipe(tc.actual, assert.equal(tc.expected), task.of),
            }),
          ],
          runTests({}),
          logErrorDetailsF({ console: { log: logRef.write } })
        )
      ),
      task.chainIOK((logRef) => logRef.read),
      task.map(string.split('\n')),
      task.map(
        assert.equalArray([
          `${red}${bold}${invert} FAIL ${invertEnd}${boldEnd}${colorEnd} foo`,
          `${red}${bold}AssertionError:${boldEnd}${colorEnd}`,
          ``,
          `  ${green}- Expected  - ${tc.numMinus}${colorEnd}`,
          `  ${red}+ Received  + ${tc.numPlus}${colorEnd}`,
          `  `,
          ...tc.log,
          ``,
        ])
      )
    ),
  });

const cases: readonly Case[] = [
  {
    name: 'minus diff is logged with minus(-) prefix and red(31) color',
    actual: { minus: 'minusValue' },
    expected: {},
    numMinus: 0,
    numPlus: 1,
    log: [`    {`, `  ${red}+   "minus": "minusValue",${colorEnd}`, `    }`],
  },

  {
    name: 'plus diff is logged with plus(+) prefix and green(32) color',
    actual: {},
    expected: { plus: 'plusValue' },
    numMinus: 1,
    numPlus: 0,
    log: [`    {`, `  ${green}-   "plus": "plusValue",${colorEnd}`, `    }`],
  },

  {
    name: 'can use undefined in actual',
    actual: { minus: 'minusValue' },
    expected: undefined,
    numMinus: 1,
    numPlus: 3,
    log: [
      `  ${green}- undefined${colorEnd}`,
      `  ${red}+ {${colorEnd}`,
      `  ${red}+   "minus": "minusValue",${colorEnd}`,
      `  ${red}+ }${colorEnd}`,
    ],
  },

  {
    name: 'can use undefined in expected',
    actual: undefined,
    expected: { plus: 'plusValue' },
    numMinus: 3,
    numPlus: 1,
    log: [
      `  ${green}- {${colorEnd}`,
      `  ${green}-   "plus": "plusValue",${colorEnd}`,
      `  ${green}- }${colorEnd}`,
      `  ${red}+ undefined${colorEnd}`,
    ],
  },

  {
    name: 'can differentiate actual undefined and expected string "undefined"',
    actual: 'undefined',
    expected: undefined,
    numPlus: 1,
    numMinus: 1,
    log: [`  ${green}- undefined${colorEnd}`, `  ${red}+ "undefined"${colorEnd}`],
  },

  {
    name: 'can differentiate actual string "undefined" and expected undefined',
    actual: undefined,
    expected: 'undefined',
    numPlus: 1,
    numMinus: 1,
    log: [`  ${green}- "undefined"${colorEnd}`, `  ${red}+ undefined${colorEnd}`],
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
