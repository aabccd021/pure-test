import { either, readonlyArray, string, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

import type { Named, TestUnit } from '../type';
import { SuiteError } from '../type';

const getFirstDuplicate = (arr: readonly string[]) =>
  pipe(
    arr,
    readonlyArray.reduce(either.right<string, readonly string[]>([]), (acc, el) =>
      pipe(
        acc,
        either.chain((accr) =>
          readonlyArray.elem(string.Eq)(el)(accr) ? either.left(el) : either.right([...accr, el])
        )
      )
    )
  );

export const throwOnDuplicateTestName: <L>(
  res: TaskEither<L, readonly Named<TestUnit>[]>
) => TaskEither<L | SuiteError, readonly Named<TestUnit>[]> = taskEither.chainEitherKW((tests) =>
  pipe(
    tests,
    readonlyArray.map(({ name }) => name),
    getFirstDuplicate,
    either.bimap(
      (name) => SuiteError.as.DuplicateTestName({ name }),
      () => tests
    )
  )
);
