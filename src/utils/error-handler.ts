/**
 * Comprehensive Error Handler
 * Provides automatic error recovery and user-friendly error messages
 */

import { logger } from './logger';
import { isWindows } from './windows-compat';

export enum ErrorCode {
  // General errors
  UNKNOWN = 'UNKNOWN',
  CONFIGURATION = 'CONFIGURATION',
  INITIALIZATION = 'INITIALIZATION',

  // Browser errors
  BROWSER_LAUNCH_FAILED = 'BROWSER_LAUNCH_FAILED',
  BROWSER_CRASHED = 'BROWSER_CRASHED',
  BROWSER_NOT_FOUND = 'BROWSER_NOT_FOUND',
  BROWSER_TIMEOUT = 'BROWSER_TIMEOUT',

  // Profile errors
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  PROFILE_CORRUPTED = 'PROFILE_CORRUPTED',
  PROFILE_SAVE_FAILED = 'PROFILE_SAVE_FAILED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  PROXY_ERROR = 'PROXY_ERROR',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  TIMEOUT = 'TIMEOUT',

  // File system errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DISK_FULL = 'DISK_FULL',
  FILE_LOCKED = 'FILE_LOCKED',

  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_LOCKED = 'DATABASE_LOCKED',

  // Authentication errors
  AUTH_FAILED = 'AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  originalError?: Error;
  recoverable: boolean;
  recoveryAction?: string;
  context?: Record<string, any>;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly recoverable: boolean;
  public readonly recoveryAction?: string;
  public readonly context?: Record<string, any>;
  public readonly originalError?: Error;
  public readonly timestamp: Date;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'AppError';
    this.code = details.code;
    this.recoverable = details.recoverable;
    this.recoveryAction = details.recoveryAction;
    this.context = details.context;
    this.originalError = details.originalError;
    this.timestamp = new Date();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      recoveryAction: this.recoveryAction,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Error recovery strategies
 */
type RecoveryStrategy = () => Promise<boolean>;

const recoveryStrategies: Map<ErrorCode, RecoveryStrategy[]> = new Map();

/**
 * Register a recovery strategy for an error code
 */
export function registerRecoveryStrategy(code: ErrorCode, strategy: RecoveryStrategy): void {
  const strategies = recoveryStrategies.get(code) || [];
  strategies.push(strategy);
  recoveryStrategies.set(code, strategies);
}

/**
 * Attempt to recover from an error
 */
export async function attemptRecovery(error: AppError): Promise<boolean> {
  if (!error.recoverable) {
    logger.warn('Error is not recoverable', { code: error.code });
    return false;
  }

  const strategies = recoveryStrategies.get(error.code);
  if (!strategies || strategies.length === 0) {
    logger.warn('No recovery strategies registered for error', { code: error.code });
    return false;
  }

  for (const strategy of strategies) {
    try {
      const success = await strategy();
      if (success) {
        logger.info('Error recovered successfully', { code: error.code });
        return true;
      }
    } catch (recoveryError) {
      logger.error('Recovery strategy failed', { error: recoveryError });
    }
  }

  return false;
}

/**
 * Analyze an error and create an AppError with proper details
 */
export function analyzeError(error: unknown, context?: Record<string, any>): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const err = error instanceof Error ? error : new Error(String(error));
  const message = err.message.toLowerCase();

  // Browser errors
  if (message.includes('failed to launch') || message.includes('could not find browser')) {
    return new AppError({
      code: ErrorCode.BROWSER_NOT_FOUND,
      message: 'Браузер не найден. Установите Chrome или позвольте Puppeteer скачать Chromium.',
      originalError: err,
      recoverable: true,
      recoveryAction: 'Запустите: npx puppeteer browsers install chrome',
      context,
    });
  }

  if (message.includes('crashed') || message.includes('target closed')) {
    return new AppError({
      code: ErrorCode.BROWSER_CRASHED,
      message: 'Браузер неожиданно закрылся.',
      originalError: err,
      recoverable: true,
      recoveryAction: 'Перезапустите браузер',
      context,
    });
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    return new AppError({
      code: ErrorCode.TIMEOUT,
      message: 'Превышено время ожидания операции.',
      originalError: err,
      recoverable: true,
      recoveryAction: 'Проверьте соединение и попробуйте снова',
      context,
    });
  }

  // Network errors
  if (message.includes('econnrefused') || message.includes('connection refused')) {
    return new AppError({
      code: ErrorCode.CONNECTION_REFUSED,
      message: 'Не удалось подключиться к серверу.',
      originalError: err,
      recoverable: true,
      recoveryAction: 'Проверьте, запущен ли сервер',
      context,
    });
  }

  if (message.includes('proxy') || message.includes('tunnel')) {
    return new AppError({
      code: ErrorCode.PROXY_ERROR,
      message: 'Ошибка прокси-соединения.',
      originalError: err,
      recoverable: true,
      recoveryAction: 'Проверьте настройки прокси',
      context,
    });
  }

  // File system errors
  if (message.includes('enoent') || message.includes('no such file')) {
    return new AppError({
      code: ErrorCode.FILE_NOT_FOUND,
      message: 'Файл или директория не найдены.',
      originalError: err,
      recoverable: true,
      recoveryAction: 'Запустите npm run fix для восстановления',
      context,
    });
  }

  if (message.includes('eacces') || message.includes('eperm') || message.includes('permission denied')) {
    return new AppError({
      code: ErrorCode.PERMISSION_DENIED,
      message: isWindows
        ? 'Нет доступа к файлу. Возможно, он заблокирован антивирусом или другой программой.'
        : 'Нет доступа к файлу. Проверьте права доступа.',
      originalError: err,
      recoverable: true,
      recoveryAction: isWindows
        ? 'Запустите от имени администратора или добавьте исключение в антивирусе'
        : 'Используйте sudo или измените права доступа',
      context,
    });
  }

  if (message.includes('ebusy') || message.includes('resource busy')) {
    return new AppError({
      code: ErrorCode.FILE_LOCKED,
      message: 'Файл заблокирован другим процессом.',
      originalError: err,
      recoverable: true,
      recoveryAction: 'Закройте другие программы, использующие этот файл',
      context,
    });
  }

  if (message.includes('enospc') || message.includes('no space')) {
    return new AppError({
      code: ErrorCode.DISK_FULL,
      message: 'Недостаточно места на диске.',
      originalError: err,
      recoverable: false,
      recoveryAction: 'Освободите место на диске',
      context,
    });
  }

  // Database errors
  if (message.includes('sqlite') || message.includes('database')) {
    if (message.includes('locked') || message.includes('busy')) {
      return new AppError({
        code: ErrorCode.DATABASE_LOCKED,
        message: 'База данных заблокирована.',
        originalError: err,
        recoverable: true,
        recoveryAction: 'Подождите и попробуйте снова',
        context,
      });
    }

    return new AppError({
      code: ErrorCode.DATABASE_ERROR,
      message: 'Ошибка базы данных.',
      originalError: err,
      recoverable: true,
      recoveryAction: 'Запустите npm run fix для восстановления',
      context,
    });
  }

  // Profile errors
  if (message.includes('profile')) {
    return new AppError({
      code: ErrorCode.PROFILE_CORRUPTED,
      message: 'Профиль повреждён.',
      originalError: err,
      recoverable: true,
      recoveryAction: 'Создайте новый профиль',
      context,
    });
  }

  // Default unknown error
  return new AppError({
    code: ErrorCode.UNKNOWN,
    message: err.message || 'Неизвестная ошибка',
    originalError: err,
    recoverable: false,
    context,
  });
}

/**
 * Safe execution wrapper with automatic error handling
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  options: {
    context?: Record<string, any>;
    fallback?: T;
    retries?: number;
    retryDelay?: number;
    onError?: (error: AppError) => void;
  } = {}
): Promise<T | undefined> {
  const { context, fallback, retries = 0, retryDelay = 1000, onError } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const appError = analyzeError(error, {
        ...context,
        attempt: attempt + 1,
        maxAttempts: retries + 1,
      });

      logger.error('Safe execution failed', {
        code: appError.code,
        message: appError.message,
        attempt: attempt + 1,
        maxAttempts: retries + 1,
      });

      if (onError) {
        onError(appError);
      }

      // Try to recover
      if (appError.recoverable && attempt < retries) {
        const recovered = await attemptRecovery(appError);
        if (recovered) {
          continue; // Retry after recovery
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }

      // No more retries or not recoverable
      if (fallback !== undefined) {
        return fallback;
      }

      throw appError;
    }
  }

  return fallback;
}

/**
 * Format error for display to user
 */
export function formatErrorForUser(error: AppError | Error): string {
  if (error instanceof AppError) {
    let message = `Ошибка: ${error.message}`;

    if (error.recoveryAction) {
      message += `\n\nРешение: ${error.recoveryAction}`;
    }

    return message;
  }

  return `Ошибка: ${error.message}`;
}

/**
 * Global error handler setup
 */
export function setupGlobalErrorHandlers(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    const appError = analyzeError(error);
    logger.error('Uncaught exception', appError.toJSON());

    // Try to recover
    attemptRecovery(appError).then(recovered => {
      if (!recovered) {
        logger.error('Failed to recover from uncaught exception');
        // Don't exit immediately - give time to log
        setTimeout(() => process.exit(1), 1000);
      }
    });
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any) => {
    const appError = analyzeError(reason);
    logger.error('Unhandled rejection', appError.toJSON());

    attemptRecovery(appError);
  });

  // Handle warnings
  process.on('warning', (warning: Error) => {
    logger.warn('Process warning', {
      name: warning.name,
      message: warning.message,
    });
  });

  logger.info('Global error handlers installed');
}

// Register default recovery strategies
registerRecoveryStrategy(ErrorCode.FILE_NOT_FOUND, async () => {
  // Try to run fix script
  try {
    const { execSync } = await import('child_process');
    execSync('npm run fix', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
});

registerRecoveryStrategy(ErrorCode.DATABASE_LOCKED, async () => {
  // Wait and retry
  await new Promise(resolve => setTimeout(resolve, 2000));
  return true;
});

registerRecoveryStrategy(ErrorCode.FILE_LOCKED, async () => {
  // Wait for file to be released
  await new Promise(resolve => setTimeout(resolve, 1000));
  return true;
});
