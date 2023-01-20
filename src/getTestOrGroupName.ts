import { match } from 'ts-pattern';

import type { TestOrGroup } from '.';

export const getTestOrGroupName = (test: TestOrGroup): string =>
  match(test)
    .with({ type: 'test' }, ({ assert }) => assert.name)
    .with({ type: 'group' }, ({ name }) => name)
    .exhaustive();
