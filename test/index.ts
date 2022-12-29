import { either, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import {
  aggregateErrors,
  colorizeChanges,
  getTestTasks,
  runParallel,
  runTests,
  test,
} from '../src';

const tests = [
  test({
    name: 'real test',
    expect: pipe(
      [
        test({
          name: 'exampleTest',
          expect: task.of({
            minus: 'minusValue',
          }),
          toResult: {},
        }),
      ],
      getTestTasks,
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
    name: 'real test',
    expect: pipe(
      [
        test({
          name: 'exampleTest',
          expect: task.of({}),
          toResult: {
            plus: 'plusValue',
          },
        }),
      ],
      getTestTasks,
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
