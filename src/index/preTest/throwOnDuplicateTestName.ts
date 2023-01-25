import { either, readonlyArray, string, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

import type { SuiteError, TestUnit } from '../type';

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

export const throwOnDuplicateTestName: (
  res: TaskEither<SuiteError.Union, readonly TestUnit.Union[]>
) => TaskEither<SuiteError.Union, readonly TestUnit.Union[]> = taskEither.chainEitherK((tests) =>
  pipe(
    tests,
    readonlyArray.map(({ name }) => name),
    getFirstDuplicate,
    either.bimap(
      (name): SuiteError.Union => ({ type: 'DuplicateTestName', name }),
      () => tests
    )
  )
);
