/**
 * Enhanced Logging System
 * Provides structured logging with context, timestamps, and multiple outputs
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  prefix: string;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Log output handler
 */
export type LogHandler = (entry: LogEntry) => void;

/**
 * Enhanced Logger with structured logging
 */
export class Logger {
  private level: LogLevel;
  private prefix: string;
  private handlers: LogHandler[] = [];
  private context: Record<string, unknown> = {};

  constructor(prefix: string = 'UndetectBrowser', level: LogLevel = LogLevel.INFO) {
    this.prefix = prefix;
    this.level = level;

    // Add default console handler
    this.addHandler(this.consoleHandler);
  }

  /**
   * Set logging level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get current logging level
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Add a log handler
   */
  addHandler(handler: LogHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Remove all handlers
   */
  clearHandlers(): void {
    this.handlers = [];
  }

  /**
   * Set global context that will be included in all logs
   */
  setContext(context: Record<string, unknown>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear global context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Error level logging
   */
  error(message: string, errorOrContext?: Error | Record<string, unknown> | unknown): void {
    if (errorOrContext instanceof Error) {
      this.log(LogLevel.ERROR, message, undefined, errorOrContext);
    } else if (typeof errorOrContext === 'object' && errorOrContext !== null) {
      this.log(LogLevel.ERROR, message, errorOrContext as Record<string, unknown>);
    } else {
      this.log(LogLevel.ERROR, message);
    }
  }

  /**
   * Log with specific level
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    if (this.level > level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      prefix: this.prefix,
      message,
      context: { ...this.context, ...context },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // Send to all handlers
    for (const handler of this.handlers) {
      try {
        handler(entry);
      } catch (handlerError) {
        // Prevent handler errors from breaking logging
        console.error('Log handler error:', handlerError);
      }
    }
  }

  /**
   * Default console handler
   */
  private consoleHandler(entry: LogEntry): void {
    const { timestamp, level, prefix, message, context, error } = entry;
    const timeStr = new Date(timestamp).toLocaleTimeString();
    const logMessage = `[${prefix}] [${level}] ${timeStr} - ${message}`;

    const logFn =
      level === 'ERROR'
        ? console.error
        : level === 'WARN'
        ? console.warn
        : console.log;

    if (context && Object.keys(context).length > 0) {
      logFn(logMessage, context);
    } else {
      logFn(logMessage);
    }

    if (error) {
      console.error('Error details:', error);
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalPrefix: string, additionalContext?: Record<string, unknown>): Logger {
    const childLogger = new Logger(
      `${this.prefix}:${additionalPrefix}`,
      this.level
    );
    childLogger.setContext({ ...this.context, ...additionalContext });
    // Copy handlers to child
    childLogger.clearHandlers();
    for (const handler of this.handlers) {
      childLogger.addHandler(handler);
    }
    return childLogger;
  }

  /**
   * Measure execution time of a function
   */
  async measureTime<T>(
    label: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.debug(`${label} completed`, { duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(
        `${label} failed after ${duration}ms`,
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Log with performance metrics
   */
  perf(operation: string, metrics: Record<string, number | string>): void {
    this.debug(`Performance: ${operation}`, metrics);
  }
}

/**
 * JSON log handler for structured output
 */
export function createJsonHandler(): LogHandler {
  return (entry: LogEntry) => {
    console.log(JSON.stringify(entry));
  };
}

/**
 * File log handler (for Node.js environments)
 */
export function createFileHandler(filepath: string): LogHandler {
  let fs: typeof import('fs');
  try {
    fs = require('fs');
  } catch {
    throw new Error('File handler requires Node.js fs module');
  }

  return (entry: LogEntry) => {
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(filepath, logLine, 'utf-8');
  };
}

/**
 * Buffer handler that accumulates logs
 */
export function createBufferHandler(buffer: LogEntry[]): LogHandler {
  return (entry: LogEntry) => {
    buffer.push(entry);
  };
}

/**
 * Filtering handler that only logs entries matching a condition
 */
export function createFilterHandler(
  condition: (entry: LogEntry) => boolean,
  handler: LogHandler
): LogHandler {
  return (entry: LogEntry) => {
    if (condition(entry)) {
      handler(entry);
    }
  };
}

/**
 * Global logger instance
 */
export const logger = new Logger();

/**
 * Set global log level from environment variable
 */
if (typeof process !== 'undefined' && process.env.LOG_LEVEL) {
  const envLevel = process.env.LOG_LEVEL.toUpperCase();
  if (envLevel in LogLevel) {
    logger.setLevel(LogLevel[envLevel as keyof typeof LogLevel]);
  }
}
