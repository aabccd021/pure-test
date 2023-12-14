import { assert, test } from '@src';
import { readonlyArray, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

type Case = {
  readonly name: string;
  readonly received: string;
  readonly expected: readonly string[];
};

const caseToTest = (tc: Case) =>
  test({ name: tc.name, act: pipe(tc.received, assert.stringInLinesEqual(tc.expected), task.of) });

const cases: readonly Case[] = [
  { name: 'string', received: 'foo', expected: ['foo'] },
  { name: 'empty string', received: '', expected: [''] },
  { name: '2 line string', received: 'foo\nbar', expected: ['foo', 'bar'] },
  { name: 'string ends with newline', received: 'foo\n', expected: ['foo', ''] },
  { name: 'string starts with newline', received: '\nfoo', expected: ['', 'foo'] },
  { name: 'string with consequtive newline', received: 'foo\n\nbar', expected: ['foo', '', 'bar'] },
];

export const tests = readonlyArray.map(caseToTest)(cases);
