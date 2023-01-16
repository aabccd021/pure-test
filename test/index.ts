import { either, ioRef, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import { logErrors, logErrorsF, runTests, setExitCode, test } from '../src';
import { testW } from '../src/test';

const tests = [
  test({
    name: 'minus diff is logged with minus(-) prefix and red(31) color',
    act: pipe(
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
            testW({
              name: 'foo test',
              act: task.of({ minus: 'minusValue' }),
              assert: {},
            }),
          ],
          runTests({}),
          logErrorsF(env)
        )
      ),
      task.chainIOK(({ logsRef }) => logsRef.read)
    ),
    assert: [
      '\nfoo test',
      `\x1b[31m- {}\x1b[0m` +
        `\n\x1b[32m+ {\x1b[0m` +
        `\n\x1b[32m+   "minus": "minusValue"\x1b[0m` +
        `\n\x1b[32m+ }\x1b[0m`,
    ],
  }),

  test({
    name: 'plus diff is logged with plus(+) prefix and green(32) color',
    act: pipe(
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
            testW({
              name: 'foo test',
              act: task.of({}),
              assert: { plus: 'plusValue' },
            }),
          ],
          runTests({}),
          logErrorsF(env)
        )
      ),
      task.chainIOK(({ logsRef }) => logsRef.read)
    ),
    assert: [
      '\nfoo test',
      `\x1b[31m- {\x1b[0m` +
        `\n\x1b[31m-   "plus": "plusValue"\x1b[0m` +
        `\n\x1b[31m- }\x1b[0m` +
        `\n\x1b[32m+ {}\x1b[0m`,
    ],
  }),

  test({
    name: 'minus diff returns left',
    act: pipe(
      [
        testW({
          name: 'foo test',
          act: task.of({ minus: 'minusValue' }),
          assert: {},
        }),
      ],
      runTests({})
    ),
    assert: either.left([
      {
        name: 'foo test',
        error: {
          code: 'assertion failed' as const,
          diff: [
            {
              type: '-' as const,
              value: '{}',
            },
            {
              type: '+' as const,
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
    act: pipe(
      [
        testW({
          name: 'foo test',
          act: task.of({}),
          assert: { plus: 'plusValue' },
        }),
      ],
      runTests({})
    ),
    assert: either.left([
      {
        name: 'foo test',
        error: {
          code: 'assertion failed' as const,
          diff: [
            {
              type: '-' as const,
              value: '{\n  "plus": "plusValue"\n}',
            },
            {
              type: '+' as const,
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
