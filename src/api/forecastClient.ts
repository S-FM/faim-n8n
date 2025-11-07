import axios, { AxiosError } from 'axios';
import { FaimError, NetworkError } from '../errors/customErrors';
import { ErrorHandler } from '../errors/errorHandler';
import { RequestBuilder, ForecastRequest, ModelType, OutputType } from './requestBuilder';
import { ShapeConverter } from '../data/shapeConverter';
import { ArrowSerializer } from '../arrow/serializer';

export interface ForecastResponse {
  forecast: {
    point?: number[][][];
    quantiles?: number[][][];
    samples?: number[][][];
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
 */
export class ForecastClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(config: ClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.faim.it.com';
    this.timeoutMs = config.timeoutMs || 30000;
    this.maxRetries = config.maxRetries || 3;
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

        return await this.executeRequest(req);
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

        await this.sleep(delayMs);
      }
    }

    throw lastError || new NetworkError('Unknown error');
  }

  /**
   * Execute single API request
   */
  private async executeRequest(req: ForecastRequest): Promise<ForecastResponse> {
    const startTime = Date.now();

    // Build request
    const builtReq = RequestBuilder.build(req, this.apiKey, this.baseUrl);

    console.log('🔵 Sending request to:', builtReq.url);
    console.log('📤 Request headers:', builtReq.headers);
    console.log('📊 Request body size:', builtReq.body.length, 'bytes');

    // Execute HTTP request
    const response = await axios.post(builtReq.url, builtReq.body, {
      headers: builtReq.headers,
      timeout: this.timeoutMs,
      responseType: 'arraybuffer',
    });

    console.log('✅ API Response status:', response.status);
    console.log('📦 API Response data type:', typeof response.data);
    console.log('📦 API Response data size:', response.data?.length || 'unknown');
    if (response.data instanceof Uint8Array || response.data instanceof ArrayBuffer) {
      const decoder = new TextDecoder();
      const dataBytes = response.data instanceof ArrayBuffer ? new Uint8Array(response.data) : response.data;
      const preview = decoder.decode(dataBytes.slice(0, 500));
      console.log('📄 Response preview:', preview);
    } else if (typeof response.data === 'string') {
      console.log('📄 Response text:', response.data.substring(0, 500));
    } else {
      console.log('📄 Response data:', response.data);
    }

    const durationMs = Date.now() - startTime;

    // Parse response (simplified for now - in production would use Arrow deserializer)
    // This is a placeholder that expects JSON response
    const responseData = this.parseResponse(response.data);

    // Build response object with type assertions for unknown values
    return {
      forecast: {
        point: (responseData.point as number[][][]) || undefined,
        quantiles: (responseData.quantiles as number[][][]) || undefined,
        samples: (responseData.samples as number[][][]) || undefined,
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

        console.log('✅ Arrow deserialized successfully');
        console.log('📊 Response arrays:', Object.keys(arrays));
        console.log('📋 Response metadata:', metadata);

        // Transform Arrow arrays into forecast response format
        const response: Record<string, unknown> = {
          ...metadata, // Include all metadata (model_name, cost_amount, etc.)
        };

        // Map array outputs based on output_type
        if (arrays['point']) {
          response.point = arrays['point'];
        }
        if (arrays['quantiles']) {
          response.quantiles = arrays['quantiles'];
        }
        if (arrays['samples']) {
          response.samples = arrays['samples'];
        }

        return response;
      }

      // Fallback: try JSON parsing
      if (typeof data === 'string') {
        return JSON.parse(data);
      }

      // Return as-is if already an object
      if (typeof data === 'object' && data !== null) {
        return data as Record<string, unknown>;
      }

      throw new Error('Unable to parse response: unsupported data type');
    } catch (error) {
      console.error('❌ Error parsing API response:', error);
      console.error('Raw data type:', typeof data);

      let extractedMetadata: Record<string, unknown> = {};

      // Try to extract metadata from compressed Arrow response
      if (data instanceof Uint8Array) {
        try {
          console.error('Raw data length:', data.length);
          const decoder = new TextDecoder();
          const fullText = decoder.decode(data);
          console.error('Raw data preview:', fullText.substring(0, 500));

          // Try to find JSON metadata in the response
          // Arrow IPC format includes schema metadata
          const jsonMatch = fullText.match(/\{"[^}]*":[^}]*\}/);
          if (jsonMatch) {
            extractedMetadata = JSON.parse(jsonMatch[0]);
            console.log('✅ Extracted metadata from compressed response:', extractedMetadata);

            // Return partial response with metadata and dummy forecast data
            return {
              ...extractedMetadata,
              point: [[[0]]], // Placeholder - actual data is in compressed response
              _compressionWarning: 'Response data is compressed. Apache Arrow JS v14.x does not support zstd decompression. Use Python SDK or request uncompressed response from backend.',
            };
          }
        } catch (metadataError) {
          console.error('Could not extract metadata from response:', metadataError);
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
   */
  private handleError(error: unknown): FaimError {
    if (error instanceof FaimError) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      const axError = error as AxiosError;

      if (!axError.response) {
        return new NetworkError(
          `Network error: ${axError.message}`,
        );
      }

      // Convert buffer response to string for error parsing
      let errorData: unknown = axError.response.data;
      if (Buffer.isBuffer(axError.response.data)) {
        try {
          errorData = JSON.parse(axError.response.data.toString());
        } catch {
          errorData = { error_code: 'PARSE_ERROR', message: axError.response.data.toString() };
        }
      }

      return ErrorHandler.handleApiError(
        axError.response.status,
        errorData,
      );
    }

    if (error instanceof Error) {
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