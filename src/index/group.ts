import { concurrencyDefault } from './_internal/concurrencyDefault';
import type { Named, TestUnit } from './type';
import type { Test } from './type/testUnit';

export const group = (param: {
  readonly name: string;
  readonly concurrency?:
    | { readonly type: 'parallel' }
    | { readonly type: 'sequential'; readonly failFast?: false };
  readonly tests: readonly Named<Test>[];
}): Named<TestUnit.Group> => ({
  name: param.name,
  value: { unit: 'Group', tests: param.tests, concurrency: concurrencyDefault(param.concurrency) },
});
