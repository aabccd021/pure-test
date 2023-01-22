import { match } from 'ts-pattern';

import type { Test } from '../type';

export const getTestName = (test: Test): string =>
  match(test)
    .with({ type: 'single' }, ({ assert }) => assert.name)
    .with({ type: 'group' }, ({ name }) => name)
    .exhaustive();
