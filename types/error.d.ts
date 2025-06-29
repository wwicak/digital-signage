// types/error.d.ts

/**
 * Interface for HTTP errors with status codes
 * Used in API error handling to properly type errors that have HTTP status codes
 */
export interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

/**
 * Type guard to check if an error is an HttpError
 */
export function isHttpError(error: unknown): error is HttpError {
  return (
    error instanceof Error &&
    (typeof (error as any).status === 'number' ||
     typeof (error as any).statusCode === 'number')
  );
}

/**
 * Type guard to check if an error has a message property
 */
export function hasErrorMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}

/**
 * Get HTTP status code from error
 */
export function getHttpStatusFromError(error: unknown): number {
  if (isHttpError(error)) {
    return error.status || error.statusCode || 500;
  }
  return 500;
}

/**
 * Get error message safely
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (hasErrorMessage(error)) {
    return error.message;
  }
  return 'An unknown error occurred';
}