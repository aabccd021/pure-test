import { exitF } from './exitF';

export { exitF };

export const exit = exitF({
  process: {
    exit: (exitCode) => () => process.exit(exitCode),
  },
});
