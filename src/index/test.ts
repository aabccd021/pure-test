import type { Task } from 'fp-ts/Task';
import * as retry from 'retry-ts';

import type { Assert, Named, TestUnit } from './type';

export const test = (param: {
  readonly name: string;
  readonly act: Task<Assert.Union>;
  readonly timeout?: number;
  readonly retry?: retry.RetryPolicy;
}): Named<TestUnit.Test> => ({
  name: param.name,
  value: {
    unit: 'Test',
    act: param.act,
    timeout: param.timeout ?? 5000,
    retry: param.retry ?? retry.limitRetries(0),
  },
});
