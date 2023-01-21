import process from 'node:process';

import { exitF } from './exitF';

export const exit = exitF({ process: { exit: (exitCode) => () => process.exit(exitCode) } });
