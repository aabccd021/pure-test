import { either, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import { runTests } from '../src';
import { test } from '../src/test';

export const tests = [
  test({
    name: 'should be able to compare between undefined',
    act: task.of(undefined),
    assert: undefined,
  }),

  test({
    name: 'should be able to compare null',
    act: task.of(null),
    assert: null,
  }),

  test({
    name: 'should be able to compare string',
    act: task.of('foo'),
    assert: 'foo',
  }),

  test({
    name: 'should be able to compare number',
    act: task.of(10),
    assert: 10,
  }),

  test({
    name: 'should return left when comparing functions',
    act: pipe(
      [
        test({
          name: 'foo',
          act: task.of(() => 42),
          assert: () => 42,
        }),
      ],
      runTests({})
    ),
    assert: [
      either.left({ name: 'foo', error: { code: 'serialization failed' as const, details: {} } }),
    ],
  }),

  test({
    name: 'should be able to compare boolean',
    act: task.of(true),
    assert: true,
  }),
];
