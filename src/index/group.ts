import type { ConcurrencyConfig, Named, TestUnit } from './type';
import type { Test } from './type/testUnit';

export const group = (param: {
  readonly name: string;
  readonly concurrency?: ConcurrencyConfig;
  readonly asserts: readonly Named<Test>[];
}): Named<TestUnit.Group> => ({
  name: param.name,
  value: {
    type: 'group',
    asserts: param.asserts,
    concurrency: param.concurrency ?? { type: 'parallel' },
  },
});
