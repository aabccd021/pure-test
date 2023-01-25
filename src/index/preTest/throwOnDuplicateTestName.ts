import { either, readonlyArray, string, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

import type { Named, SuiteError, TestUnit } from '../type';
import { suiteError } from '../type';

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
  res: TaskEither<L, readonly Named<TestUnit.Union>[]>
) => TaskEither<L | SuiteError.DuplicateTestName, readonly Named<TestUnit.Union>[]> =
  taskEither.chainEitherKW((tests) =>
    pipe(
      tests,
      readonlyArray.map(({ name }) => name),
      getFirstDuplicate,
      either.bimap(suiteError.duplicateTestName, () => tests)
    )
  );
