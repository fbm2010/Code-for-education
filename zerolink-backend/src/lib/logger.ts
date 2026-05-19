import { createRequire } from 'module';
import { config } from '../config.js';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pinoFn = require('pino') as (opts: Record<string, unknown>) => {
  info:  (obj: Record<string, unknown> | string, msg?: string) => void;
  debug: (obj: Record<string, unknown> | string, msg?: string) => void;
  warn:  (obj: Record<string, unknown> | string, msg?: string) => void;
  error: (obj: Record<string, unknown> | string, msg?: string) => void;
  fatal: (obj: Record<string, unknown> | string, msg?: string) => void;
  child: (bindings: Record<string, unknown>) => typeof logger;
};

export const logger = pinoFn({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(config.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
  base:     { service: 'zerolink-api', env: config.NODE_ENV },
  redact:   ['req.headers.cookie', 'req.headers.authorization', '*.password_hash', '*.password'],
});

export type Logger = typeof logger;
