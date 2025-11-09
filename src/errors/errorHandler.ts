import { ApiError, FaimError } from './customErrors';

export interface ErrorResponse {
  error_code: string;
  message: string;
  detail?: string;
  request_id?: string;
}

/**
 * Maps HTTP status codes and error responses to FaimError instances
 */
export class ErrorHandler {
  static handleApiError(statusCode: number, data: unknown): FaimError {
    console.log(`\n❌ API Error Response (Status ${statusCode}):`);
    console.log('Data type:', typeof data);
    console.log('Data value:', data);

    // Try to parse as ErrorResponse
    if (typeof data === 'object' && data !== null) {
      const response = data as Record<string, unknown>;
      const errorCode = String(response.error_code || 'UNKNOWN_ERROR');
      const message = String(response.message || 'An error occurred');
      const detail = response.detail ? String(response.detail) : undefined;

      console.log(`Error code: ${errorCode}, Message: ${message}`);
      return new ApiError(errorCode, message, statusCode, detail);
    }

    // Fallback for non-JSON responses
    console.log(`Falling back to status code handler for ${statusCode}`);
    return this.handleStatusCode(statusCode);
  }

  private static handleStatusCode(statusCode: number): FaimError {
    switch (statusCode) {
      case 401:
        return new ApiError(
          'AUTHENTICATION_REQUIRED',
          'Invalid or missing API key',
          401,
        );
      case 402:
        return new ApiError(
          'INSUFFICIENT_FUNDS',
          'Account balance insufficient',
          402,
        );
      case 404:
        return new ApiError('MODEL_NOT_FOUND', 'Model not found', 404);
      case 413:
        return new ApiError(
          'REQUEST_TOO_LARGE',
          'Request exceeds maximum size',
          413,
        );
      case 422:
        return new ApiError('VALIDATION_ERROR', 'Invalid request data', 422);
      case 500:
        return new ApiError(
          'INFERENCE_ERROR',
          'Server inference error',
          500,
        );
      case 503:
        return new ApiError(
          'RESOURCE_EXHAUSTED',
          'Server resources unavailable',
          503,
        );
      case 504:
        return new ApiError('TIMEOUT_ERROR', 'Request timeout', 504);
      default:
        return new ApiError(
          'INTERNAL_ERROR',
          `HTTP ${statusCode}`,
          statusCode,
        );
    }
  }

  /**
   * User-friendly error message for n8n display
   */
  static getUserMessage(error: FaimError): string {
    switch (error.code) {
      case 'AUTHENTICATION_REQUIRED':
      case 'INVALID_API_KEY':
        return 'Invalid API key. Check your credentials.';
      case 'INSUFFICIENT_FUNDS':
        return 'Account balance insufficient. Add credit to your account.';
      case 'MODEL_NOT_FOUND':
        return 'Model not found. Check model name and version.';
      case 'REQUEST_TOO_LARGE':
        return 'Request too large. Reduce batch size or sequence length.';
      case 'TIMEOUT_ERROR':
        return 'Request timeout. Try again with smaller batch size.';
      case 'RESOURCE_EXHAUSTED':
        return 'Server resources exhausted. Retry in a few seconds.';
      case 'OUT_OF_MEMORY':
        return 'Server out of memory. Reduce batch size and retry.';
      case 'VALIDATION_ERROR':
      case 'MISSING_REQUIRED_FIELD':
      case 'INVALID_PARAMETER':
      case 'INVALID_SHAPE':
      case 'INVALID_DTYPE':
      case 'INVALID_VALUE_RANGE':
        return `Invalid input: ${error.message}`;
      case 'INFERENCE_ERROR':
        return 'Model inference failed. Check input data format.';
      case 'DATA_PROCESSING_ERROR':
        return `Data processing error: ${error.message}`;
      case 'NETWORK_ERROR':
        return 'Network error. Check connection and retry.';
      default:
        return error.message;
    }
  }
}