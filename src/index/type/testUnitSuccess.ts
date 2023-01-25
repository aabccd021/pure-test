import type { Named, TestSuccess } from '.';

export type Test = { readonly unit: 'Test'; readonly value: TestSuccess };

export const test = (value: TestSuccess): Test => ({ unit: 'Test', value });

export type Group = { readonly unit: 'Group'; readonly results: readonly Named<TestSuccess>[] };

export const group = (results: readonly Named<TestSuccess>[]): Group => ({
  unit: 'Group',
  results,
});

export type Union = Group | Test;
