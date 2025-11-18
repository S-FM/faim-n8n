/**
 * JSON Serializer for FAIM API
 * Handles serialization to JSON request payloads and deserialization of JSON responses
 * No external dependencies - pure JSON, no Arrow binary format
 */

import { NormalizedData } from './shapeConverter';
import { OutputType } from '../api/requestBuilder';

/**
 * REQUEST PAYLOAD INTERFACE
 * Sent to FAIM API as JSON
 */
export interface JSONPayload {
  // REQUIRED: Time series data [batch, sequence, features]
  x: number[][][];

  // REQUIRED: Forecast horizon length
  horizon: number;

  // REQUIRED: Output format type
  output_type: 'point' | 'quantiles' | 'samples';

  // OPTIONAL: Quantile levels for "quantiles" output type
  quantiles?: number[];

  // OPTIONAL: Number of samples for "samples" output type (default: 1)
  num_samples?: number;

  // OPTIONAL: Compression format (default: "zstd")
  compression?: 'zstd' | null;

  // OPTIONAL: Model-specific parameters
  [key: string]: unknown;
}

/**
 * SUCCESS RESPONSE INTERFACE
 * Returned from FAIM API on successful forecast
 *
 * Note: Point forecast output shape varies by model:
 * - FlowState/TiRex: [batch, horizon] (2D)
 * - Chronos2: [batch, horizon, features] (3D)
 */
export interface JSONResponse {
  // Response status
  status: 'success' | 'success_with_warning';

  // Output arrays (keys depend on model and output_type)
  outputs: {
    // Point forecast: shape varies by model
    // - FlowState/TiRex: [batch, horizon]
    // - Chronos2: [batch, horizon, features]
    point?: number[][] | number[][][];

    // Quantile forecast: [batch, horizon, quantiles, features]
    quantiles?: number[][][][];

    // Sample forecast: [batch, horizon, samples, features]
    samples?: number[][][][];

    // Allow model-specific output keys
    [key: string]: unknown;
  };

  // Response metadata
  metadata: {
    // Model identifier
    model_name: string;

    // Model version
    model_version?: string;

    // Token/inference count
    token_count: number;

    // Billing information
    transaction_id?: string;
    cost_amount?: string;
    cost_currency?: string;

    // Allow additional fields
    [key: string]: unknown;
  };
}

/**
 * ERROR RESPONSE INTERFACE
 * Returned from FAIM API on error
 */
export interface JSONErrorResponse {
  // Machine-readable error code
  error_code: string;

  // Human-readable message
  message: string;

  // Additional error details
  detail?: string;

  // Request ID for debugging/support
  request_id?: string;

  // Allow additional fields
  [key: string]: unknown;
}

/**
 * JSON Serializer for FAIM forecasting
 * Converts normalized time-series data to/from JSON format
 */
export class JSONSerializer {
  /**
   * Serialize normalized data to JSON request payload
   * @param data Normalized time series data [batch, sequence, features]
   * @param horizon Forecast horizon length
   * @param outputType Output format: 'point', 'quantiles', or 'samples'
   * @param parameters Additional parameters (quantiles, num_samples, compression, etc.)
   * @returns JSON string ready to send to API
   */
  static serialize(
    data: NormalizedData,
    horizon: number,
    outputType: OutputType,
    parameters: Record<string, unknown>,
  ): string {
    const payload: JSONPayload = {
      x: data.x, // Already normalized to [batch, sequence, features]
      horizon,
      output_type: outputType,
      ...parameters, // Includes quantiles, num_samples, compression, model params
    };

    return JSON.stringify(payload);
  }

  /**
   * Deserialize JSON response from API
   * @param jsonString JSON response text from API
   * @returns Parsed JSON response object
   * @throws SyntaxError if JSON is invalid
   */
  static deserialize(jsonString: string): JSONResponse | JSONErrorResponse {
    return JSON.parse(jsonString) as JSONResponse | JSONErrorResponse;
  }

  /**
   * Type guard to check if response is an error
   * @param data Unknown response data
   * @returns true if data is a JSONErrorResponse
   */
  static isError(data: unknown): data is JSONErrorResponse {
    return (
      typeof data === 'object' &&
      data !== null &&
      'error_code' in data &&
      'message' in data
    );
  }

  /**
   * Type guard to check if response is successful
   * @param data Unknown response data
   * @returns true if data is a JSONResponse
   */
  static isSuccess(data: unknown): data is JSONResponse {
    return (
      typeof data === 'object' &&
      data !== null &&
      'status' in data &&
      'outputs' in data &&
      'metadata' in data
    );
  }

  /**
   * Detect if point forecast is 2D or 3D
   * FlowState/TiRex: [batch, horizon] (2D)
   * Chronos2: [batch, horizon, features] (3D)
   * @param pointData Point forecast data from response
   * @returns true if 3D, false if 2D
   */
  static isPoint3D(pointData: number[][] | number[][][]): pointData is number[][][] {
    if (!Array.isArray(pointData) || pointData.length === 0) {
      return false;
    }

    const firstBatch = pointData[0];
    if (!Array.isArray(firstBatch) || firstBatch.length === 0) {
      return false;
    }

    // Check if first element of first batch is an array (3D) or number (2D)
    return Array.isArray(firstBatch[0]);
  }
}