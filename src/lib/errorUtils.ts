/**
 * Centralized error handling utilities
 * Provides consistent error handling patterns across the application
 * 
 * @example
 * // Basic usage with general context
 * handleApiError(error, 'menyimpan data');
 * 
 * // With custom message for more specific context
 * handleApiError(error, 'menyimpan data', 'Gagal membuat guru baru');
 * 
 * // Using helper function for dynamic messages
 * const message = createErrorContext('data guru', 'menyimpan data');
 * handleApiError(error, 'menyimpan data', message);
 */

export type ErrorContext = 
  | 'menyimpan data'
  | 'memuat data'
  | 'menghapus data'
  | 'mengupdate data'
  | 'reset'
  | 'autentikasi'
  | 'validasi'
  | 'network'
  | 'unknown';

export interface ErrorInfo {
  context: ErrorContext;
  message?: string;
  originalError?: unknown;
  timestamp: number;
}

/**
 * Standardized error handler for API operations
 */
export const handleApiError = (error: unknown, context: ErrorContext, customMessage?: string): ErrorInfo => {
  const errorInfo: ErrorInfo = {
    context,
    timestamp: Date.now(),
    originalError: error,
  };

  // Check if this is a Next.js redirect error (not a real error)
  if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
    // Don't log redirect errors as they are expected behavior
    errorInfo.message = 'Redirect in progress';
    return errorInfo;
  }

  // Use custom message if provided, otherwise extract from error
  if (customMessage) {
    errorInfo.message = customMessage;
  } else if (error instanceof Error) {
    errorInfo.message = error.message;
  } else if (typeof error === 'string') {
    errorInfo.message = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorInfo.message = String(error.message);
  } else {
    errorInfo.message = 'Terjadi kesalahan yang tidak diketahui';
  }

  // Log error for debugging (only for real errors, not redirects)
  console.error(`[${context.toUpperCase()}] Error:`, {
    message: errorInfo.message,
    originalError: error,
    timestamp: new Date(errorInfo.timestamp).toISOString(),
  });

  return errorInfo;
};

/**
 * Helper function to create specific error messages with general context
 */
export const createErrorContext = (operation: string, context: ErrorContext): string => {
  const contextMap = {
    'menyimpan data': 'menyimpan',
    'memuat data': 'memuat',
    'menghapus data': 'menghapus',
    'mengupdate data': 'mengupdate',
    'reset': 'mereset',
    'autentikasi': 'autentikasi',
    'validasi': 'validasi',
    'network': 'koneksi',
    'unknown': 'operasi'
  };
  
  const action = contextMap[context] || 'operasi';
  return `Gagal ${action} ${operation}`;
};

/**
 * Type-safe error handler that returns a standardized error message
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Terjadi kesalahan yang tidak diketahui';
};

/**
 * Validation error handler
 */
export const handleValidationError = (field: string, value: unknown): string => {
  return `Field '${field}' tidak valid: ${JSON.stringify(value)}`;
};

/**
 * Network error handler
 */
export const handleNetworkError = (error: unknown): string => {
  const message = getErrorMessage(error);
  if (message.includes('fetch') || message.includes('network')) {
    return 'Koneksi jaringan bermasalah. Silakan coba lagi.';
  }
  return message;
};

/**
 * Authentication error handler
 */
export const handleAuthError = (error: unknown): string => {
  const message = getErrorMessage(error);
  if (message.includes('auth') || message.includes('login')) {
    return 'Sesi Anda telah berakhir. Silakan login kembali.';
  }
  return message;
};

/**
 * Check if error is a Next.js redirect error (expected behavior)
 */
export const isRedirectError = (error: unknown): boolean => {
  return error instanceof Error && error.message === 'NEXT_REDIRECT';
};

/**
 * Handle server action errors with proper redirect error handling
 */
export const handleServerActionError = (error: unknown, context: ErrorContext, customMessage?: string): ErrorInfo | null => {
  // If it's a redirect error, don't treat it as an error
  if (isRedirectError(error)) {
    return null;
  }
  
  // Handle actual errors
  return handleApiError(error, context, customMessage);
}; 