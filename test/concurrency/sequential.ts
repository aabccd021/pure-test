import { either, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import { assert, runTests, test } from '../../src';

export const tests = [
  test({
    name: 'sequential',
    act: pipe(
      [
        test({
          name: 'should pass',
          act: pipe('foo', assert.equal('foo'), task.of),
        }),
        test({
          name: 'should fail',
          act: pipe('foo', assert.equal('bar'), task.of),
        }),
        test({
          name: 'should skip',
          act: pipe('foo', assert.equal('foo'), task.of),
        }),
      ],
      runTests({
        concurrency: {
          type: 'sequential',
        },
      }),
      task.map(assert.equalArrayW([either.left(undefined)]))
    ),
  }),
];
