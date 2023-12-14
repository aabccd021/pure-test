import { assert, group, test } from '@src';
import { readonlyArray, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

type Case = { readonly name: string; readonly received: unknown; readonly expected: unknown };

const caseToTest = (tc: Case) =>
  test({ name: tc.name, act: pipe(tc.received, assert.equal(tc.expected), task.of) });

const cases: readonly Case[] = [
  { name: 'undefined', received: undefined, expected: undefined },
  { name: 'null', received: null, expected: null },
  { name: 'string', received: 'foo', expected: 'foo' },
  { name: 'number', received: 10, expected: 10 },
  { name: 'object with number index', received: { 1: 1 }, expected: { 1: 1 } },
  { name: 'boolean', received: true, expected: true },
];

export const tests = [group({ name: 'pass', tests: readonlyArray.map(caseToTest)(cases) })];
