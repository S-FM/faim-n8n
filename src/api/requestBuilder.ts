import { ValidationError } from '../errors/customErrors';
import { ArrowSerializer } from '../arrow/serializer';
import { NormalizedData } from '../data/shapeConverter';

export type ModelType = 'chronos2';
export type OutputType = 'point' | 'quantiles' | 'samples';

export interface ForecastRequest {
  model: ModelType;
  modelVersion: string;
  data: NormalizedData;
  horizon: number;
  outputType: OutputType;
  parameters: Record<string, unknown>;
}

export interface BuiltRequest {
  body: Uint8Array;
  headers: Record<string, string>;
  url: string;
}

/**
 * Builds Arrow-formatted requests for FAIM forecast API (n8n node mode)
 *
 * The FAIM backend requires all requests in a specific format:
 * - Data: 3D array (batch, sequence, features) serialized to Arrow IPC format
 * - The n8n node restricts to univariate data: features must equal 1
 * - Metadata: JSON object containing horizon, output_type, and optional parameters
 *
 * Request format:
 * POST /v1/ts/forecast/{model}/{version}
 * Authorization: Bearer {apiKey}
 * Content-Type: application/vnd.apache.arrow.stream
 * Accept-Encoding: identity (request uncompressed response)
 *
 * Body: Arrow IPC binary stream
 */
export class RequestBuilder {
  private static readonly VALID_MODELS = ['chronos2'];
  private static readonly VALID_OUTPUT_TYPES = ['point', 'quantiles', 'samples'];
  private static readonly MIN_HORIZON = 1;
  private static readonly MAX_HORIZON = 1000;

  /**
   * Build complete forecast request with validation
   *
   * Validates:
   * - Model is supported (chronos2)
   * - Horizon is in valid range (1-1000)
   * - Output type is valid (point, quantiles, samples)
   * - Data is univariate (features=1)
   *
   * @param req - Forecast request with normalized data
   * @param apiKey - FAIM API key for authorization
   * @param baseUrl - FAIM API base URL
   * @returns Built request with Arrow-serialized body and headers
   * @throws ValidationError if any validation fails
   */
  static build(
    req: ForecastRequest,
    apiKey: string,
    baseUrl: string,
  ): BuiltRequest {
    // Validate inputs
    this.validateModel(req.model);
    this.validateHorizon(req.horizon);
    this.validateOutputType(req.outputType);
    this.validateUnivariateData(req.data);

    // Validate and build metadata
    const metadata = this.buildMetadata(req);

    // Convert data to Arrow format
    const arrays = this.prepareArrays(req);

    // Serialize to Arrow IPC
    const body = ArrowSerializer.serialize(arrays, metadata);

    // Build URL
    const url = `${baseUrl}/v1/ts/forecast/${req.model}/${req.modelVersion}`;

    // Build headers
    const headers = this.buildHeaders(apiKey, body.length);

    return { body, headers, url };
  }

  /**
   * Build metadata dict (stored in Arrow schema metadata)
   */
  private static buildMetadata(req: ForecastRequest): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      horizon: req.horizon,
      output_type: req.outputType,
      compression: null, // Request uncompressed response from backend
    };

    // Chronos2-specific parameters
    if (req.outputType === 'quantiles' && req.parameters.quantiles !== undefined) {
      metadata.quantiles = req.parameters.quantiles;
    }

    return metadata;
  }

  /**
   * Prepare data arrays in Arrow format
   * Matches Python SDK format: pass 3D array x as-is
   * Arrow serializer will handle flattening and shape metadata
   */
  private static prepareArrays(req: ForecastRequest): Record<string, number[] | number[][] | number[][][]> {
    // Pass 3D array directly: ArrowSerializer will flatten and store shape metadata
    // Shape: (batch, sequence, features)
    return {
      x: req.data.x,
    };
  }

  /**
   * Build HTTP headers
   */
  private static buildHeaders(apiKey: string, contentLength: number): Record<string, string> {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/vnd.apache.arrow.stream',
      'Content-Length': String(contentLength),
      'Accept-Encoding': 'identity', // Request uncompressed response - Apache Arrow JS doesn't support zstd compression
    };
  }

  /**
   * Validate model selection
   */
  private static validateModel(model: string): void {
    if (!this.VALID_MODELS.includes(model)) {
      throw new ValidationError(
        `Invalid model '${model}'. Must be one of: ${this.VALID_MODELS.join(', ')}`,
        'model',
      );
    }
  }

  /**
   * Validate horizon
   */
  private static validateHorizon(horizon: number): void {
    if (!Number.isInteger(horizon)) {
      throw new ValidationError('Horizon must be an integer', 'horizon');
    }
    if (horizon < this.MIN_HORIZON || horizon > this.MAX_HORIZON) {
      throw new ValidationError(
        `Horizon must be between ${this.MIN_HORIZON} and ${this.MAX_HORIZON}, got ${horizon}`,
        'horizon',
      );
    }
  }

  /**
   * Validate output type
   */
  private static validateOutputType(outputType: string): void {
    if (!this.VALID_OUTPUT_TYPES.includes(outputType)) {
      throw new ValidationError(
        `Invalid output_type '${outputType}'. Must be one of: ${this.VALID_OUTPUT_TYPES.join(', ')}`,
        'outputType',
      );
    }
  }

  /**
   * Validate that data is univariate (features=1)
   *
   * The n8n node only supports univariate forecasting.
   * Multivariate data should have been rejected earlier in ShapeConverter,
   * but we double-check here as a safety measure.
   *
   * @throws ValidationError if features != 1
   */
  private static validateUnivariateData(data: NormalizedData): void {
    if (data.features !== 1) {
      throw new ValidationError(
        `Multivariate data detected (features=${data.features}). ` +
        'The n8n node only supports univariate forecasting (features=1). ' +
        'This error should not occur - please check input validation in ShapeConverter.',
        'data',
      );
    }
  }
}