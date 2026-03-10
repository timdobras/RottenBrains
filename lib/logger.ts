/**
 * Logger utility for the application
 * Provides different log levels and environment-aware logging
 */

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabledLevels: LogLevel[];
  enableProductionLogs: boolean;
}

class Logger {
  private config: LoggerConfig;
  private isDevelopment: boolean;

  constructor(config?: Partial<LoggerConfig>) {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.config = {
      enabledLevels: config?.enabledLevels || ['debug', 'info', 'warn', 'error'],
      enableProductionLogs: config?.enableProductionLogs ?? false,
    };
  }

  /**
   * Debug level logging - only in development
   */
  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.log('[DEBUG]', ...args);
    }
  }

  /**
   * Info level logging
   */
  info(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info('[INFO]', ...args);
    }
  }

  /**
   * Warning level logging
   */
  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', ...args);
    }
  }

  /**
   * Error level logging - always logs, sends to Sentry for tracking
   */
  error(...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error('[ERROR]', ...args);
      this.sendToErrorTracking(args);
    }
  }

  /**
   * Performance timing logging
   */
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  /**
   * End performance timing
   */
  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  /**
   * Determine if we should log based on environment and level
   */
  private shouldLog(level: LogLevel): boolean {
    // Always log errors
    if (level === 'error') return true;

    // In development, log everything enabled
    if (this.isDevelopment) {
      return this.config.enabledLevels.includes(level);
    }

    // In production, only log if explicitly enabled
    return this.config.enableProductionLogs && this.config.enabledLevels.includes(level);
  }

  /**
   * Send errors to Sentry for tracking
   */
  private sendToErrorTracking(args: unknown[]): void {
    const error = args[0];

    if (error instanceof Error) {
      Sentry.captureException(error);
    } else if (typeof error === 'string') {
      Sentry.captureMessage(error, 'error');
    } else {
      Sentry.captureMessage(String(error), 'error');
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for custom instances if needed
export { Logger };
