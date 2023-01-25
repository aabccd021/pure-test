import type { Named, TestSuccess } from '.';

export type Test = { readonly unit: 'test'; readonly value: TestSuccess };

export const test = (value: TestSuccess): Test => ({ unit: 'test', value });

export type Group = { readonly unit: 'group'; readonly results: readonly Named<TestSuccess>[] };

export const group = (results: readonly Named<TestSuccess>[]): Group => ({
  unit: 'group',
  results,
});

export type Union = Group | Test;
