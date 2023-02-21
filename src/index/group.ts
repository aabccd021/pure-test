import { concurrencyDefault } from './_internal/concurrencyDefault';
import type { Group, Named, Test } from './type';

export const group = (param: {
  readonly name: string;
  readonly concurrency?:
    | { readonly type: 'parallel' }
    | { readonly type: 'sequential'; readonly failFast?: false };
  readonly tests: readonly Named<Test>[];
}): Named<Group> => ({
  name: param.name,
  value: { unit: 'Group', tests: param.tests, concurrency: concurrencyDefault(param.concurrency) },
});
