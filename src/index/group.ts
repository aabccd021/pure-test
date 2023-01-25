import { concurrencyDefault } from './_internal/concurrencyDefault';
import type { ConcurrencyConfig, Named, TestUnit } from './type';
import type { Test } from './type/testUnit';

export const group = (param: {
  readonly name: string;
  readonly concurrency?: ConcurrencyConfig;
  readonly asserts: readonly Named<Test>[];
}): Named<TestUnit.Group> => ({
  name: param.name,
  value: {
    unit: 'Group',
    tests: param.asserts,
    concurrency: concurrencyDefault(param.concurrency),
  },
});
