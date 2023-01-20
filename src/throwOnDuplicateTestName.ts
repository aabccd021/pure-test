import { either, readonlyArray, string, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

import { getTestOrGroupName } from './getTestOrGroupName';
import type { SuiteError, TestOrGroup } from './type';

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
  res: TaskEither<SuiteError, readonly TestOrGroup[]>
) => TaskEither<SuiteError, readonly TestOrGroup[]> = taskEither.chainEitherK((tests) =>
  pipe(
    tests,
    readonlyArray.map(getTestOrGroupName),
    getFirstDuplicate,
    either.bimap(
      (name): SuiteError => ({ type: 'DuplicateTestName', name }),
      () => tests
    )
  )
);
