const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  error: (msg: string, err?: any) => {
    if (isDev) console.error(msg, err);
    // In prod: send to Sentry / Datadog etc.
  },
  warn: (msg: string, err?: any) => {
    if (isDev) console.warn(msg, err);
    // In prod: send to Sentry / Datadog etc.
  },
  info: (msg: string, ...args: any[]) => {
    if (isDev) console.info(msg, ...args);
  },
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
};