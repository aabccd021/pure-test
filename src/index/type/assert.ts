export type Equal = {
  readonly assert: 'Equal';
  readonly expected: unknown;
  readonly received: unknown;
};

export type Union = Equal;
