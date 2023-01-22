import { assert, logErrorDetailsF, runTests, test } from '@src';
import { ioRef, readonlyArray, string, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

const green = '\x1b[32m';
const red = '\x1b[31m';
const colorEnd = '\x1b[39m';

const bold = '\x1b[1m';
const boldEnd = '\x1b[22m';

const invert = '\x1b[7m';
const invertEnd = '\x1b[27m';

type Case = {
  readonly name: string;
  readonly received: unknown;
  readonly expected: unknown;
  readonly log: readonly string[];
  readonly receivedCount: number;
  readonly expectedCount: number;
};

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(
      task.fromIO(ioRef.newIORef<string>('')),
      task.chainFirst((logRef) =>
        pipe(
          taskEither.right([
            test({ name: 'foo', act: pipe(tc.received, assert.equal(tc.expected), task.of) }),
          ]),
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
          `  ${green}- Expected  - ${tc.expectedCount}${colorEnd}`,
          `  ${red}+ Received  + ${tc.receivedCount}${colorEnd}`,
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
    received: { minus: 'minusValue' },
    expected: {},
    expectedCount: 0,
    receivedCount: 1,
    log: [`    {`, `  ${red}+   "minus": "minusValue",${colorEnd}`, `    }`],
  },

  {
    name: 'multiple line minus diff is indented correctly',
    received: { nested: { minus: 'minusValue' } },
    expected: {},
    expectedCount: 0,
    receivedCount: 3,
    log: [
      `    {`,
      `  ${red}+   "nested": {${colorEnd}`,
      `  ${red}+     "minus": "minusValue",${colorEnd}`,
      `  ${red}+   },${colorEnd}`,
      `    }`,
    ],
  },

  {
    name: 'plus diff is logged with plus(+) prefix and green(32) color',
    received: {},
    expected: { plus: 'plusValue' },
    expectedCount: 1,
    receivedCount: 0,
    log: [`    {`, `  ${green}-   "plus": "plusValue",${colorEnd}`, `    }`],
  },

  {
    name: 'can use undefined in received',
    received: { minus: 'minusValue' },
    expected: undefined,
    expectedCount: 1,
    receivedCount: 3,
    log: [
      `  ${green}- undefined${colorEnd}`,
      `  ${red}+ {${colorEnd}`,
      `  ${red}+   "minus": "minusValue",${colorEnd}`,
      `  ${red}+ }${colorEnd}`,
    ],
  },

  {
    name: 'can use undefined in expected',
    received: undefined,
    expected: { plus: 'plusValue' },
    expectedCount: 3,
    receivedCount: 1,
    log: [
      `  ${green}- {${colorEnd}`,
      `  ${green}-   "plus": "plusValue",${colorEnd}`,
      `  ${green}- }${colorEnd}`,
      `  ${red}+ undefined${colorEnd}`,
    ],
  },

  {
    name: 'can differentiate received undefined and expected string "undefined"',
    received: 'undefined',
    expected: undefined,
    receivedCount: 1,
    expectedCount: 1,
    log: [`  ${green}- undefined${colorEnd}`, `  ${red}+ "undefined"${colorEnd}`],
  },

  {
    name: 'can differentiate received string "undefined" and expected undefined',
    received: undefined,
    expected: 'undefined',
    receivedCount: 1,
    expectedCount: 1,
    log: [`  ${green}- "undefined"${colorEnd}`, `  ${red}+ undefined${colorEnd}`],
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
