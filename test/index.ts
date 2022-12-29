import { either, readonlyArray, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import {
  aggregateErrors,
  colorizeChanges,
  runParallel,
  runTest,
  runTests,
  test,
  testWithRetry,
  withRetry,
} from '../src';

const tests = [
  test({
    name: 'aab',
    expect: pipe(
      [
        testWithRetry({
          name: 'exampleTest',
          expect: task.of({
            minus: 'minusValue',
          }),
          toResult: {},
        }),
      ],
      readonlyArray.map(withRetry(runTest)),
      runParallel,
      aggregateErrors,
      colorizeChanges
    ),
    toResult: either.left([
      {
        name: 'exampleTest',
        err:
          `\x1b[31m- {}\x1b[0m` +
          `\n\x1b[32m+ {\x1b[0m` +
          `\n\x1b[32m+   "minus": "minusValue"\x1b[0m` +
          `\n\x1b[32m+ }\x1b[0m`,
      },
    ]),
  }),

  test({
    name: 'ccd',
    expect: pipe(
      [
        testWithRetry({
          name: 'exampleTest',
          expect: task.of({}),
          toResult: {
            plus: 'plusValue',
          },
        }),
      ],
      readonlyArray.map(withRetry(runTest)),
      runParallel,
      aggregateErrors,
      colorizeChanges
    ),
    toResult: either.left([
      {
        name: 'exampleTest',
        err:
          `\x1b[31m- {\x1b[0m` +
          `\n\x1b[31m-   "plus": "plusValue"\x1b[0m` +
          `\n\x1b[31m- }\x1b[0m` +
          `\n\x1b[32m+ {}\x1b[0m`,
      },
    ]),
  }),
];

export const main = runTests(tests);
