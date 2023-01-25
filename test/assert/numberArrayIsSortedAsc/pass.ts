import { assert, test } from '@src';
import { readonlyArray, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

type Case = {
  readonly name: string;
  readonly received: readonly number[];
};

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(tc.received, assert.numberArrayIsSortedAsc, task.of),
  });

const cases: readonly Case[] = [
  { name: 'empty array', received: [] },
  { name: 'one number', received: [1] },
  { name: 'two number', received: [1, 2] },
  { name: 'three number', received: [1, 2, 3] },
];

export const tests = readonlyArray.map(caseToTest)(cases);
