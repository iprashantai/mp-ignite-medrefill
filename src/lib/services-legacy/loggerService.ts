/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console */

/**
 * Logger Service (Stub)
 *
 * Stub implementation for logging functionality
 */

export const logger = {
  info: (...args: any[]) => console.log('[LEGACY INFO]', ...args),
  warn: (...args: any[]) => console.warn('[LEGACY WARN]', ...args),
  error: (...args: any[]) => console.error('[LEGACY ERROR]', ...args),
  debug: (...args: any[]) => console.debug('[LEGACY DEBUG]', ...args),
};

export default logger;
