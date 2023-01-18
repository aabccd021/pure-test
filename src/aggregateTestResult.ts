import { either, readonlyArray } from 'fp-ts';
import { identity, pipe } from 'fp-ts/function';

import type { TestPassResult, TestResult, TestsResult } from './type';

export const aggregateTestResult = (r: readonly TestsResult[]): TestsResult =>
  pipe(
    r,
    readonlyArray.reduce(
      either.right<readonly TestResult[], readonly TestPassResult[]>([]),
      (acc, el) =>
        pipe(
          acc,
          either.chain(
            (accr): TestsResult =>
              pipe(
                el,
                either.bimap(
                  (ell) =>
                    pipe(accr, readonlyArray.map(either.right), (accra) => [...accra, ...ell]),
                  (elr) => [...accr, ...elr]
                )
              )
          ),
          either.mapLeft((accl): readonly TestResult[] =>
            pipe(el, either.match(identity, readonlyArray.map(either.right)), (newAcc) => [
              ...accl,
              ...newAcc,
            ])
          )
        )
    )
  );
