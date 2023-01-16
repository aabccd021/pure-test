import { ioRef, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import { logErrors, logErrorsF, runTests, setExitCode, test } from '../src';
import { testW } from '../src/test';

const testLogResult = (p: {
  readonly name: string;
  readonly actual: unknown;
  readonly expected: unknown;
  readonly log: string;
}) =>
  test({
    name: p.name,
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
              act: task.of(p.actual),
              assert: p.expected,
            }),
          ],
          runTests({}),
          logErrorsF(env)
        )
      ),
      task.chainIOK(({ logsRef }) => logsRef.read)
    ),
    assert: ['\nfoo test', p.log],
  });

const tests = [
  testLogResult({
    name: 'minus diff is logged with minus(-) prefix and red(31) color',
    actual: { minus: 'minusValue' },
    expected: {},
    log:
      `\x1b[31m- {}\x1b[0m` +
      `\n\x1b[32m+ {\x1b[0m` +
      `\n\x1b[32m+   "minus": "minusValue"\x1b[0m` +
      `\n\x1b[32m+ }\x1b[0m`,
  }),

  testLogResult({
    name: 'plus diff is logged with plus(+) prefix and green(32) color',
    actual: {},
    expected: { plus: 'plusValue' },
    log:
      `\x1b[31m- {\x1b[0m` +
      `\n\x1b[31m-   "plus": "plusValue"\x1b[0m` +
      `\n\x1b[31m- }\x1b[0m` +
      `\n\x1b[32m+ {}\x1b[0m`,
  }),
];

export const main = pipe(tests, runTests({}), logErrors, setExitCode);
