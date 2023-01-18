import { either, readonlyArray, task, taskEither } from 'fp-ts';
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
    name: 'should be able to compare foobar',
    act: task.of(['fo > ba', 'zz', 'ba']),
    assert: ['foo > bar', 'zz', 'baz'],
  }),

  test({
    name: 'should be able to compare aab',
    act: task.of(['aacc']),
    assert: ['aabccd'],
  }),

  test({
    name: 'should return left when comparing functions',
    act: pipe(
      [
        test({
          name: '',
          act: task.of(() => 42),
          assert: () => 42,
        }),
      ],
      runTests({}),
      taskEither.mapLeft(readonlyArray.map(({ error }) => error))
    ),
    assert: either.left([{ code: 'serialization failed' as const, details: {} }]),
  }),

  test({
    name: 'should be able to compare boolean',
    act: task.of(true),
    assert: true,
  }),
];
