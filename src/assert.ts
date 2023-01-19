import type { AssertEqual } from './type';

export const equalW =
  (expected: unknown) =>
  (actual: unknown): AssertEqual => ({
    type: 'AssertEqual',
    expected,
    actual,
  });

export const equal =
  <T>(expected: T) =>
  (actual: T): AssertEqual => ({
    type: 'AssertEqual',
    expected,
    actual,
  });

export const equalArrayW =
  (expected: readonly unknown[]) =>
  (actual: readonly unknown[]): AssertEqual => ({
    type: 'AssertEqual',
    expected,
    actual,
  });

export const equalArray =
  <T>(expected: readonly T[]) =>
  (actual: readonly T[]): AssertEqual => ({
    type: 'AssertEqual',
    expected,
    actual,
  });
