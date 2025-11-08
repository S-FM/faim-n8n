import { ValidationError } from '../errors/customErrors';
import { ArrowSerializer } from '../arrow/serializer';
import { NormalizedData } from '../data/shapeConverter';

export type ModelType = 'flowstate' | 'chronos2' | 'tirex';
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
 * Builds Arrow-formatted requests for FAIM forecast API
 */
export class RequestBuilder {
  private static readonly VALID_MODELS = ['flowstate', 'chronos2', 'tirex'];
  private static readonly VALID_OUTPUT_TYPES = ['point', 'quantiles', 'samples'];
  private static readonly MIN_HORIZON = 1;
  private static readonly MAX_HORIZON = 1000;

  /**
   * Build complete forecast request
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

    // Add model-specific parameters
    switch (req.model) {
      case 'flowstate':
        if (req.parameters.scale_factor !== undefined) {
          metadata.scale_factor = req.parameters.scale_factor;
        }
        if (req.parameters.prediction_type !== undefined) {
          metadata.prediction_type = req.parameters.prediction_type;
        }
        break;

      case 'chronos2':
        if (req.outputType === 'quantiles' && req.parameters.quantiles !== undefined) {
          metadata.quantiles = req.parameters.quantiles;
        }
        break;

      case 'tirex':
        // No additional parameters
        break;
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
}