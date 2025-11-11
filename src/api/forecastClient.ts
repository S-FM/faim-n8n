import {
  IExecuteFunctions,
  IHttpRequestOptions,
} from 'n8n-workflow';
import { FaimError, NetworkError, DataProcessingError } from '../errors/customErrors';
import { ErrorHandler } from '../errors/errorHandler';
import { RequestBuilder, ForecastRequest, ModelType, OutputType } from './requestBuilder';
import { ShapeConverter } from '../data/shapeConverter';
import { ShapeReshaper } from '../data/shapeReshaper';
import { ArrowSerializer } from '../arrow/serializer';

/**
 * Forecast response from FAIM API (n8n node mode - univariate only)
 *
 * Output shapes (after reshaping to original input format):
 * - 1D input: point → number[], quantiles → number[][], samples → number[][]
 * - 2D input: point → number[][], quantiles → number[][][], samples → number[][][]
 *
 * Note: All outputs are univariate (features=1), features dimension is removed.
 */
export interface ForecastResponse {
  forecast: {
    point?: unknown; // 1D or 2D array depending on input format
    quantiles?: unknown; // 2D or 3D array depending on input format
    samples?: unknown; // 2D or 3D array depending on input format
  };
  metadata: {
    modelName: string;
    modelVersion: string;
    transactionId?: string;
    costAmount?: string;
    costCurrency?: string;
    inputShape: {
      batch: number;
      sequence: number;
      features: number;
    };
    outputShape: {
      batch: number;
      horizon: number;
      features: number;
    };
  };
  executionStats: {
    durationMs: number;
    retryCount: number;
    batchSize: number;
  };
}

export interface ClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

/**
 * FAIM Forecast API client with retry logic
 * Uses n8n's httpRequest helper for HTTP requests
 */
export class ForecastClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly n8nContext: IExecuteFunctions;

  constructor(config: ClientConfig, n8nContext: IExecuteFunctions) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.faim.it.com';
    this.timeoutMs = config.timeoutMs ?? 30000;
    this.maxRetries = config.maxRetries ?? 3;
    this.n8nContext = n8nContext;
  }

  /**
   * Execute forecast request with retry logic
   */
  async forecast(
    model: ModelType,
    modelVersion: string,
    inputData: unknown,
    horizon: number,
    outputType: OutputType,
    parameters: Record<string, unknown> = {},
  ): Promise<ForecastResponse> {
    let lastError: FaimError | null = null;
    let retryCount = 0;

    // Normalize input data
    const normalizedData = ShapeConverter.normalize(inputData);

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const req: ForecastRequest = {
          model,
          modelVersion,
          data: normalizedData,
          horizon,
          outputType,
          parameters,
        };

        const response = await this.executeRequest(req);
        // Update retry count in execution stats
        response.executionStats.retryCount = retryCount;
        return response;
      } catch (error) {
        lastError = this.handleError(error);

        // If not retryable, throw immediately
        if (!lastError.retryable) {
          throw lastError;
        }

        // If max retries reached, throw
        if (attempt >= this.maxRetries) {
          throw lastError;
        }

        // Exponential backoff with jitter
        const baseDelay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        const jitter = Math.random() * 0.1 * baseDelay;
        const delayMs = baseDelay + jitter;

        retryCount++;
        await this.sleep(delayMs);
      }
    }

    throw lastError || new NetworkError('Unknown error');
  }

  /**
   * Execute single API request using n8n's httpRequest helper
   */
  private async executeRequest(req: ForecastRequest): Promise<ForecastResponse> {
    const startTime = Date.now();

    // Build request
    const builtReq = RequestBuilder.build(req, this.apiKey, this.baseUrl);

    // Prepare n8n httpRequest options
    const httpOptions: IHttpRequestOptions = {
      method: 'POST',
      url: builtReq.url,
      headers: builtReq.headers,
      body: builtReq.body,
      encoding: 'arraybuffer', // Equivalent to axios responseType: 'arraybuffer'
      timeout: this.timeoutMs,
      returnFullResponse: false, // Return body directly
    };

    // Execute HTTP request using n8n helper
    const response = (await this.n8nContext.helpers.httpRequest(httpOptions)) as Buffer;

    const durationMs = Date.now() - startTime;

    // Parse response (response is a Buffer from n8n httpRequest with encoding: 'arraybuffer')
    const responseData = this.parseResponse(response);

    // Reshape outputs based on original input format
    const inputFormat = req.data.inputFormat;
    let reshapedPoint: unknown = undefined;
    let reshapedQuantiles: unknown = undefined;
    let reshapedSamples: unknown = undefined;

    try {
      if (typeof responseData.point !== 'undefined' && responseData.point !== null) {
        const pointData = responseData.point as number[][][];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        reshapedPoint = ShapeReshaper.reshapePointForecast(pointData, inputFormat);
      }

      if (typeof responseData.quantiles !== 'undefined' && responseData.quantiles !== null) {
        const quantilesData = responseData.quantiles as number[][][][];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        reshapedQuantiles = ShapeReshaper.reshapeQuantilesForecast(quantilesData, inputFormat);
      }

      if (typeof responseData.samples !== 'undefined' && responseData.samples !== null) {
        const samplesData = responseData.samples as number[][][][];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        reshapedSamples = ShapeReshaper.reshapeSamplesForecast(samplesData, inputFormat);
      }
    } catch (reshapeError) {
      const errorMsg = reshapeError instanceof Error ? reshapeError.message : String(reshapeError);
      console.error('❌ Error reshaping forecast:', errorMsg);
      throw new DataProcessingError(
        `Failed to reshape forecast output: ${errorMsg}. This usually means the server returned data in an unexpected format. Please check your input data format and try again.`
      );
    }

    // Build response object with type assertions for unknown values
    return {
      forecast: {
        point: reshapedPoint,
        quantiles: reshapedQuantiles,
        samples: reshapedSamples,
      },
      metadata: {
        modelName: (responseData.model_name as string) || req.model,
        modelVersion: (responseData.model_version as string) || req.modelVersion,
        transactionId: responseData.transaction_id as string | undefined,
        costAmount: responseData.cost_amount as string | undefined,
        costCurrency: responseData.cost_currency as string | undefined,
        inputShape: {
          batch: req.data.batchSize,
          sequence: req.data.sequenceLength,
          features: req.data.features,
        },
        outputShape: {
          batch: req.data.batchSize,
          horizon: req.horizon,
          features: req.data.features,
        },
      },
      executionStats: {
        durationMs,
        retryCount: 0,
        batchSize: req.data.batchSize,
      },
    };
  }

  /**
   * Parse Arrow IPC response
   * Matches Python SDK deserialization
   */
  private parseResponse(data: unknown): Record<string, unknown> {
    try {
      // Expect Arrow IPC stream (binary Uint8Array)
      if (data instanceof Uint8Array) {
        // Deserialize Arrow stream
        const { arrays, metadata } = ArrowSerializer.deserialize(data);

        // Transform Arrow arrays into forecast response format
        const response: Record<string, unknown> = {
          ...metadata, // Include all metadata (model_name, cost_amount, etc.)
        };

        // Map array outputs based on output_type
        if (typeof arrays['point'] !== 'undefined' && arrays['point'] !== null) {
          response.point = arrays['point'];
        }
        if (typeof arrays['quantiles'] !== 'undefined' && arrays['quantiles'] !== null) {
          response.quantiles = arrays['quantiles'];
        }
        if (typeof arrays['samples'] !== 'undefined' && arrays['samples'] !== null) {
          response.samples = arrays['samples'];
        }

        return response;
      }

      // Fallback: try JSON parsing
      if (typeof data === 'string') {
        return JSON.parse(data) as Record<string, unknown>;
      }

      // Return as-is if already an object
      if (typeof data === 'object' && data !== null) {
        return data as Record<string, unknown>;
      }

      throw new Error('Unable to parse response: unsupported data type');
    } catch (error) {
      // Try to extract metadata from compressed Arrow response
      if (data instanceof Uint8Array) {
        try {
          const decoder = new TextDecoder();
          const fullText = decoder.decode(data);

          // Try to find JSON metadata in the response
          // Arrow IPC format includes schema metadata
          const jsonMatch = fullText.match(/\{"[^}]*":[^}]*\}/);
          if (jsonMatch !== null && jsonMatch.length > 0) {
            const extractedMetadata = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

            // Return partial response with metadata and dummy forecast data
            return {
              ...extractedMetadata,
              point: [[[0]]], // Placeholder - actual data is in compressed response
              _compressionWarning: 'Response data is compressed. Apache Arrow JS v14.x does not support zstd decompression. Use Python SDK or request uncompressed response from backend.',
            };
          }
        } catch {
          // Continue to throw error below
        }
      }

      // If we got here and have no data to return, throw the error
      throw new NetworkError(
        `Failed to parse API response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle errors and map to FaimError
   * Works with n8n's httpRequest helper errors
   */
  private handleError(error: unknown): FaimError {
    if (error instanceof FaimError) {
      return error;
    }

    if (error instanceof Error) {
      const errObj = error as unknown as Record<string, unknown>;

      // Handle network errors (ETIMEDOUT, ECONNRESET, etc.)
      const errorCode = errObj.code as string | undefined;
      const networkErrorCodes = [
        'ETIMEDOUT',
        'ECONNRESET',
        'ECONNREFUSED',
        'ENOTFOUND',
        'ENETUNREACH',
        'EAI_AGAIN',
        'ESOCKETTIMEDOUT',
      ];

      if (typeof errorCode === 'string' && networkErrorCodes.includes(errorCode)) {
        return new NetworkError(`Network error: ${error.message}`);
      }

      // Handle HTTP errors from n8n httpRequest
      // Note: n8n returns httpCode as a string!
      const httpCode =
        typeof errObj.httpCode === 'string' ? parseInt(errObj.httpCode, 10) : undefined;
      const statusCode = errObj.statusCode as number | undefined;
      const finalStatusCode =
        typeof statusCode === 'number' ? statusCode : typeof httpCode === 'number' ? httpCode : undefined;

      if (typeof finalStatusCode === 'number' && finalStatusCode > 0) {
        // Try to extract error data from response
        let errorData: unknown;
        const responseObj = errObj.response as Record<string, unknown> | undefined;

        if (responseObj !== undefined && responseObj !== null && typeof responseObj.body !== 'undefined') {
          const bodyData = responseObj.body;
          if (Buffer.isBuffer(bodyData)) {
            try {
              errorData = JSON.parse(bodyData.toString());
            } catch {
              errorData = {
                error_code: 'PARSE_ERROR',
                message: bodyData.toString(),
              };
            }
          } else if (typeof bodyData === 'string') {
            try {
              errorData = JSON.parse(bodyData);
            } catch {
              errorData = { error_code: 'PARSE_ERROR', message: bodyData };
            }
          } else {
            errorData = bodyData;
          }
        }

        return ErrorHandler.handleApiError(finalStatusCode, errorData);
      }

      // Generic network/timeout error
      if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        return new NetworkError(`Request timeout: ${error.message}`);
      }

      return new NetworkError(error.message);
    }

    return new NetworkError('Unknown error occurred');
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}