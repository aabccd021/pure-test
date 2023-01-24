export type Equal = {
  readonly assert: 'Equal';
  readonly expected: unknown;
  readonly received: unknown;
};

export type UnexpectedNone = { readonly assert: 'UnexpectedNone' };

export type UnexpectedLeft = { readonly assert: 'UnexpectedLeft'; readonly value: unknown };

export type UnexpectedRight = { readonly assert: 'UnexpectedRight'; readonly value: unknown };

export type Union = Equal | UnexpectedLeft | UnexpectedNone | UnexpectedRight;
