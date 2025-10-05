/**
 * Error handling utilities
 * Provides custom error classes and error handling helpers
 */

import { ERROR_CODES, ErrorCode } from './constants';
import { logger } from './logger';

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.UNKNOWN_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication error
 */
export class AuthError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    code: ErrorCode = ERROR_CODES.AUTH_UNAUTHORIZED
  ) {
    super(message, code, 401);
    this.name = 'AuthError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string>;

  constructor(message: string = 'Validation failed', fields?: Record<string, string>) {
    super(message, ERROR_CODES.VALIDATION_FAILED, 400);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed',
    code: ErrorCode = ERROR_CODES.DB_QUERY_FAILED
  ) {
    super(message, code, 500);
    this.name = 'DatabaseError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, ERROR_CODES.DB_NOT_FOUND, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * API error
 */
export class APIError extends AppError {
  constructor(
    message: string = 'API request failed',
    code: ErrorCode = ERROR_CODES.API_REQUEST_FAILED
  ) {
    super(message, code, 500);
    this.name = 'APIError';
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Error handler utility
 * Logs error and returns standardized error response
 */
export function handleError(
  error: unknown,
  context?: string
): { error: string; code: ErrorCode; statusCode: number } {
  // Log the error
  if (context) {
    logger.error(`Error in ${context}:`, error);
  } else {
    logger.error('Error:', error);
  }

  // Handle AppError instances
  if (isAppError(error)) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'message' in error) {
    const supabaseError = error as { message: string; code?: string };

    // Map common Supabase error codes
    let errorCode: ErrorCode = ERROR_CODES.DB_QUERY_FAILED;
    let statusCode = 500;

    if (supabaseError.code === '23505') {
      // Unique constraint violation
      errorCode = ERROR_CODES.DB_DUPLICATE;
      statusCode = 409;
    } else if (supabaseError.code === '23503') {
      // Foreign key constraint violation
      errorCode = ERROR_CODES.DB_CONSTRAINT_VIOLATION;
      statusCode = 400;
    } else if (supabaseError.code === 'PGRST116') {
      // Not found
      errorCode = ERROR_CODES.DB_NOT_FOUND;
      statusCode = 404;
    }

    return {
      error: 'An error occurred. Please try again.',
      code: errorCode,
      statusCode,
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      error: 'An unexpected error occurred. Please try again.',
      code: ERROR_CODES.UNKNOWN_ERROR,
      statusCode: 500,
    };
  }

  // Unknown error type
  return {
    error: 'An unexpected error occurred. Please try again.',
    code: ERROR_CODES.UNKNOWN_ERROR,
    statusCode: 500,
  };
}

/**
 * Wraps an async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw new AppError(
        handleError(error, context).error,
        handleError(error, context).code,
        handleError(error, context).statusCode
      );
    }
  }) as T;
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    logger.warn('Failed to parse JSON:', error);
    return fallback;
  }
}

/**
 * Sanitize error message for client display
 * Removes sensitive information that might be in error messages
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove file paths
  let sanitized = message.replace(/\/[^\s]+/g, '[PATH]');

  // Remove UUIDs
  sanitized = sanitized.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '[UUID]'
  );

  // Remove email addresses
  sanitized = sanitized.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');

  // Remove IP addresses
  sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');

  return sanitized;
}
