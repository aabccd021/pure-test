import { either, ioRef, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import { logErrors, logErrorsF, runTests, setExitCode, test } from '../src';

const tests = [
  test({
    name: 'minus diff is logged with minus(-) prefix and red(31) color',
    expect: pipe(
      task.Do,
      task.bind('logsRef', () => task.fromIO(ioRef.newIORef<readonly unknown[]>([]))),
      task.bind('env', ({ logsRef }) =>
        task.of({
          console: { log: (newLog: unknown) => logsRef.modify((logs) => [...logs, newLog]) },
        })
      ),
      task.chainFirst(({ env }) =>
        pipe(
          [
            test({
              name: 'foo test',
              expect: task.of({ minus: 'minusValue' }),
              toResult: {},
            }),
          ],
          runTests({}),
          logErrorsF(env)
        )
      ),
      task.chainIOK(({ logsRef }) => logsRef.read)
    ),
    toResult: [
      '\nfoo test',
      `\x1b[31m- {}\x1b[0m` +
        `\n\x1b[32m+ {\x1b[0m` +
        `\n\x1b[32m+   "minus": "minusValue"\x1b[0m` +
        `\n\x1b[32m+ }\x1b[0m`,
    ],
  }),

  test({
    name: 'plus diff is logged with plus(+) prefix and green(32) color',
    expect: pipe(
      task.Do,
      task.bind('logsRef', () => task.fromIO(ioRef.newIORef<readonly unknown[]>([]))),
      task.bind('env', ({ logsRef }) =>
        task.of({
          console: { log: (newLog: unknown) => logsRef.modify((logs) => [...logs, newLog]) },
        })
      ),
      task.chainFirst(({ env }) =>
        pipe(
          [
            test({
              name: 'foo test',
              expect: task.of({}),
              toResult: { plus: 'plusValue' },
            }),
          ],
          runTests({}),
          logErrorsF(env)
        )
      ),
      task.chainIOK(({ logsRef }) => logsRef.read)
    ),

    toResult: [
      '\nfoo test',
      `\x1b[31m- {\x1b[0m` +
        `\n\x1b[31m-   "plus": "plusValue"\x1b[0m` +
        `\n\x1b[31m- }\x1b[0m` +
        `\n\x1b[32m+ {}\x1b[0m`,
    ],
  }),

  test({
    name: 'minus diff returns left',
    expect: pipe(
      [
        test({
          name: 'foo test',
          expect: task.of({ minus: 'minusValue' }),
          toResult: {},
        }),
      ],
      runTests({})
    ),
    toResult: either.left([
      {
        name: 'foo test',
        error: {
          code: 'assertion failed',
          diff: [
            {
              type: '-',
              value: '{}',
            },
            {
              type: '+',
              value: '{\n  "minus": "minusValue"\n}',
            },
          ],
          actual: { minus: 'minusValue' },
          expected: {},
        },
      },
    ]),
  }),

  test({
    name: 'plus diff returns left',
    expect: pipe(
      [
        test({
          name: 'foo test',
          expect: task.of({}),
          toResult: { plus: 'plusValue' },
        }),
      ],
      runTests({})
    ),
    toResult: either.left([
      {
        name: 'foo test',
        error: {
          code: 'assertion failed',
          diff: [
            {
              type: '-',
              value: '{\n  "plus": "plusValue"\n}',
            },
            {
              type: '+',
              value: '{}',
            },
          ],
          actual: {},
          expected: { plus: 'plusValue' },
        },
      },
    ]),
  }),
];

export const main = pipe(tests, runTests({}), logErrors, setExitCode);
