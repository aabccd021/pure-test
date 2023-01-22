export type Equal = {
  readonly assert: 'Equal';
  readonly expected: unknown;
  readonly actual: unknown;
};

export type NumberArraySortedAsc = {
  readonly assert: 'NumberArraySortedAsc';
  readonly actual: readonly number[];
};

export type UnexpectedNone = { readonly assert: 'UnexpectedNone' };

export type UnexpectedLeft = { readonly assert: 'UnexpectedLeft'; readonly value: unknown };

export type UnexpectedRight = { readonly assert: 'UnexpectedRight'; readonly value: unknown };

export type Type = Equal | NumberArraySortedAsc | UnexpectedLeft | UnexpectedNone | UnexpectedRight;
