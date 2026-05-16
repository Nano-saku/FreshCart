const isDev = process.env.NODE_ENV !== 'production';
export const logger = {
  error: (msg: string, err?: any) => {
    if (isDev) console.error(msg, err);
    // In prod: send to Sentry / Datadog etc.
  },
  log: (...args: any[]) => { if (isDev) console.log(...args); },
};

// Replace all console.log/error with logger.error()/logger.log()
// Remove the 3 debug logs in admin/users.tsx entirely.