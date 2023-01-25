import type { TestSuccess } from '.';

export type Test = { readonly unit: 'test';  readonly timeElapsedMs: number };
export type Group = {
  readonly unit: 'group';
  readonly results: readonly TestSuccess[];
};

export type Union = Group | Test;
