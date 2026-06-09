const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  error: (msg: string, err?: any) => {
    if (isDev) console.error(msg, err);
    // In prod: send to Sentry / Datadog etc.
  },
  warn: (msg: string, ...args: any[]) => {
    if (isDev) console.warn(msg, ...args);
    // In prod: send to monitoring service
  },
  log: (...args: any[]) => { 
    if (isDev) console.log(...args); 
  },
  info: (msg: string, ...args: any[]) => {
    if (isDev) console.info(msg, ...args);
  },
  debug: (msg: string, ...args: any[]) => {
    if (isDev) console.debug(msg, ...args);
  },
};

// Replace all console.log/error with logger.error()/logger.log()
// Remove the 3 debug logs in admin/users.tsx entirely.