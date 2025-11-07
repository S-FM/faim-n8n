/**
 * Custom error classes for FAIM API interactions
 */

export class FaimError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'FaimError';
    Object.setPrototypeOf(this, FaimError.prototype);
  }
}

export class ValidationError extends FaimError {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message, 'VALIDATION_ERROR', 422, false);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class PayloadTooLargeError extends FaimError {
  constructor(message: string = 'Request payload exceeds maximum size (100MB)') {
    super(message, 'REQUEST_TOO_LARGE', 413, false);
    this.name = 'PayloadTooLargeError';
    Object.setPrototypeOf(this, PayloadTooLargeError.prototype);
  }
}

export class ModelNotFoundError extends FaimError {
  constructor(model: string, version: string) {
    super(
      `Model '${model}' version '${version}' not found`,
      'MODEL_NOT_FOUND',
      404,
      false,
    );
    this.name = 'ModelNotFoundError';
    Object.setPrototypeOf(this, ModelNotFoundError.prototype);
  }
}

export class TimeoutError extends FaimError {
  constructor(message: string = 'Request timeout') {
    super(message, 'TIMEOUT_ERROR', 500, true);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class ResourceExhaustedError extends FaimError {
  constructor(message: string = 'Server resources exhausted') {
    super(message, 'RESOURCE_EXHAUSTED', 503, true);
    this.name = 'ResourceExhaustedError';
    Object.setPrototypeOf(this, ResourceExhaustedError.prototype);
  }
}

export class InferenceError extends FaimError {
  constructor(message: string = 'Model inference failed') {
    super(message, 'INFERENCE_ERROR', 500, false);
    this.name = 'InferenceError';
    Object.setPrototypeOf(this, InferenceError.prototype);
  }
}

export class NetworkError extends FaimError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR', undefined, true);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class SerializationError extends FaimError {
  constructor(message: string) {
    super(message, 'SERIALIZATION_ERROR', undefined, false);
    this.name = 'SerializationError';
    Object.setPrototypeOf(this, SerializationError.prototype);
  }
}

export class ApiError extends FaimError {
  constructor(
    errorCode: string,
    message: string,
    statusCode: number,
    detail?: string,
  ) {
    const retryable = isRetryableErrorCode(errorCode);
    super(
      `[${errorCode}] ${message}${detail ? ` - ${detail}` : ''}`,
      errorCode,
      statusCode,
      retryable,
    );
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Determine if an error code should be retried
 */
function isRetryableErrorCode(code: string): boolean {
  const retryableCodes = [
    'TIMEOUT_ERROR',
    'OUT_OF_MEMORY',
    'RESOURCE_EXHAUSTED',
    'TRITON_CONNECTION_ERROR',
    'DATABASE_ERROR',
  ];
  return retryableCodes.includes(code);
}