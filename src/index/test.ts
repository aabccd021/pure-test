import type { Task } from 'fp-ts/Task';
import * as retry from 'retry-ts';

import type { AssertEqual, Named, Test } from './type';

export const test = (param: {
  readonly name: string;
  readonly act: Task<AssertEqual>;
  readonly timeout?: number;
  readonly retry?: retry.RetryPolicy;
}): Named<Test> => ({
  name: param.name,
  value: {
    unit: 'Test',
    act: param.act,
    timeout: param.timeout ?? 5000,
    retry: param.retry ?? retry.limitRetries(0),
  },
});
