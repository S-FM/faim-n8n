import { ValidationError } from '../errors/customErrors';

/**
 * Input format type for FAIM n8n node
 * The node only accepts 1D and 2D univariate time series data.
 * 3D multivariate forecasting is not yet supported.
 */
export type InputFormat = '1d' | '2d';

/**
 * Normalized data structure for backend processing
 *
 * The backend API always expects 3D arrays with shape (batch, sequence, features).
 * The FAIM n8n node restricts features to 1 (univariate only).
 *
 * Transformations:
 * - 1D input (c) → (1, c, 1): Single time series of c timesteps
 * - 2D input (b, c) → (b, c, 1): b time series, each with c timesteps
 */
export interface NormalizedData {
  x: number[][][]; // 3D array: (batch, sequence, features)
  batchSize: number;
  sequenceLength: number;
  features: number;
  inputFormat: InputFormat; // Track original input format for output reshaping
}

/**
 * Converts n8n node inputs (1D or 2D) to backend format (3D with features=1)
 *
 * The FAIM forecasting backend requires all data in 3D format: (batch, sequence, features).
 * This converter normalizes user inputs to this format while tracking the original format
 * for intelligent output reshaping.
 *
 * Supported input formats:
 * - 1D: [1, 2, 3, ...] → (1, n, 1) - single time series
 * - 2D: [[1, 2, 3], [4, 5, 6], ...] → (m, n, 1) - multiple time series
 *
 * Note: 3D multivariate inputs are rejected (features must equal 1)
 *
 * @example
 * // 1D input
 * ShapeConverter.normalize([10, 11, 12])
 * // Returns: { x: [[[10], [11], [12]]], batchSize: 1, sequenceLength: 3, features: 1, inputFormat: '1d' }
 *
 * @example
 * // 2D input (batch of 2 univariate series, 3 timesteps each)
 * ShapeConverter.normalize([[10, 11, 12], [20, 21, 22]])
 * // Returns: { x: [[[10], [11], [12]], [[20], [21], [22]]], batchSize: 2, sequenceLength: 3, features: 1, inputFormat: '2d' }
 */
export class ShapeConverter {
  private static readonly MAX_ELEMENTS = 50_000_000; // 50M elements
  private static readonly MAX_BATCH_SIZE = 1000;
  private static readonly MAX_SEQUENCE_LENGTH = 100_000;
  private static readonly MAX_FEATURES = 1000;

  /**
   * Normalize input data to 3D array (batch, sequence, features)
   */
  static normalize(inputData: unknown): NormalizedData {
    if (inputData === null || inputData === undefined) {
      throw new ValidationError('Input data is required');
    }

    const data = this.toArray(inputData);
    let result: NormalizedData;

    if (Array.isArray(data[0])) {
      if (Array.isArray(data[0][0])) {
        // Already 3D or nested
        result = this.from3D(data as number[][][]);
      } else {
        // 2D array
        result = this.from2D(data as number[][]);
      }
    } else {
      // 1D array
      result = this.from1D(data as number[]);
    }

    this.validate(result);
    return result;
  }

  /**
   * Convert 1D array to 3D: [1,2,3] → [[[1], [2], [3]]]
   * batch_size=1, sequence_length=n, features=1
   */
  private static from1D(data: number[]): NormalizedData {
    if (data.length === 0) {
      throw new ValidationError('Input array cannot be empty');
    }

    return {
      x: [data.map((el) => [el])],
      batchSize: 1,
      sequenceLength: data.length,
      features: 1,
      inputFormat: '1d',
    };
  }

  /**
   * Convert 2D array to 3D (batch, sequence, features)
   *
   * For n8n node: interprets 2D as batch of univariate series
   * - [[v1_1, v1_2, ...], [v2_1, v2_2, ...], ...] → (batch=m, sequence=n, features=1)
   * - m = number of rows (multiple series)
   * - n = length of each row (sequence length per series)
   * - features = 1 (univariate constraint - each element is a single value, not an array)
   *
   * Example: [[100, 101, 102], [200, 201, 202]] → batch=2 series, each 3 timesteps
   * Converted to: [[[100], [101], [102]], [[200], [201], [202]]]
   *
   * NOTE: The n8n node expects univariate data. If rows contain multiple features (e.g., [[a,b], [c,d]]),
   * this is multivariate and will be rejected by validation.
   *
   * Valid 2D formats:
   * - [[v1], [v2], [v3]] = 3 series, 1 timestep each → batchSize=3, sequenceLength=1, features=1
   * - [[v1, v2, v3], [v4, v5, v6]] = 2 series, 3 timesteps each → batchSize=2, sequenceLength=3, features=1
   *
   * Invalid 2D formats (multivariate - will be rejected):
   * - [[v1, v2], [v3, v4]] = 2 rows with 2 values each → interpreted as 2 series, 2 timesteps
   *   BUT each row element must be a scalar (univariate), so this becomes batchSize=2, sequenceLength=2, features=1 ✓
   *   WAIT - that's valid! The check for multivariate is on whether row values are arrays or scalars.
   *   If all values in a row are scalars, it's (batchSize, sequenceLength, features=1) ✓
   *   If values in a row are arrays like [[v1,v2]] = that's 3D input, already handled above ✗
   */
  private static from2D(data: number[][]): NormalizedData {
    if (data.length === 0) {
      throw new ValidationError('Input array cannot be empty');
    }

    // For 2D batch input: rows are different series, columns are timesteps
    const batchSize = data.length; // Number of series/rows
    const sequenceLength = data[0]?.length ?? 0; // Timesteps per series (length of first row)
    const features = 1; // Univariate constraint (each scalar value represents 1 feature)

    // Ensure all rows have same length (rectangular shape)
    for (let i = 0; i < data.length; i++) {
      if (!Array.isArray(data[i])) {
        throw new ValidationError(
          `Row ${i} is not an array`,
          'x',
        );
      }
      if (data[i].length !== sequenceLength) {
        throw new ValidationError(
          `Inconsistent row length at index ${i}: expected ${sequenceLength}, got ${data[i].length}`,
          'x',
        );
      }
    }

    // Convert 2D (batch, sequence) to 3D (batch, sequence, features=1)
    // Each row becomes: [[v1], [v2], [v3], ...] (wrapping each scalar value in an array)
    // This interpretation assumes the 2D array is already in the format users intended:
    // - Rows = different time series (batch dimension)
    // - Columns = timesteps (sequence dimension)
    // - Each scalar = univariate value (features=1)
    const x = data.map(row => row.map(value => [value]));

    return {
      x,
      batchSize,
      sequenceLength,
      features,
      inputFormat: '2d',
    };
  }

  /**
   * Reject 3D array inputs
   *
   * The n8n node does not support multivariate forecasting (3D arrays with features > 1).
   * Users should provide either:
   * - 1D array: [10, 11, 12, ...] for a single time series
   * - 2D array: [[10], [11], [12], ...] for multiple univariate series
   *
   * @throws ValidationError 3D inputs are not supported
   */
  private static from3D(data: number[][][]): NormalizedData {
    if (data.length === 0) {
      throw new ValidationError('Input array cannot be empty');
    }

    // Detect the shape for error reporting
    const batchSize = data.length;
    const sequenceLength = data[0]?.length ?? 0;
    const features = data[0]?.[0]?.length ?? 0;

    throw new ValidationError(
      `3D multivariate input detected (shape: ${batchSize} batches × ${sequenceLength} sequence × ${features} features). ` +
      'Multivariate forecasting is not yet supported. Please provide univariate data: ' +
      '1D array [10, 11, 12] for single series, or ' +
      '2D array [[10], [11], [12]] for multiple series.',
      'x',
    );
  }

  /**
   * Validate normalized data against constraints
   *
   * Note: This node only supports univariate forecasting (features=1).
   * Multivariate data is rejected here.
   */
  private static validate(data: NormalizedData): void {
    // Univariate-only constraint: The n8n node only supports single-feature forecasting
    if (data.features !== 1) {
      throw new ValidationError(
        `Multivariate input detected (${data.features} features). ` +
        'The n8n node only supports univariate forecasting (features=1). ' +
        'Please provide univariate time series data.',
        'features',
      );
    }

    // Validate dimensions
    if (data.batchSize <= 0 || data.batchSize > this.MAX_BATCH_SIZE) {
      throw new ValidationError(
        `Batch size must be between 1 and ${this.MAX_BATCH_SIZE}, got ${data.batchSize}`,
        'batchSize',
      );
    }

    if (data.sequenceLength <= 0 || data.sequenceLength > this.MAX_SEQUENCE_LENGTH) {
      throw new ValidationError(
        `Sequence length must be between 1 and ${this.MAX_SEQUENCE_LENGTH}, got ${data.sequenceLength}`,
        'sequenceLength',
      );
    }

    // Features constraint already validated above
    if (data.features <= 0 || data.features > this.MAX_FEATURES) {
      throw new ValidationError(
        `Features must be between 1 and ${this.MAX_FEATURES}, got ${data.features}`,
        'features',
      );
    }

    // Validate total size
    const totalElements = data.batchSize * data.sequenceLength * data.features;
    if (totalElements > this.MAX_ELEMENTS) {
      throw new ValidationError(
        `Total elements exceed maximum (${totalElements} > ${this.MAX_ELEMENTS}). Reduce batch size or sequence length.`,
        'x',
      );
    }

    // Validate all values are numeric
    for (let b = 0; b < data.x.length; b++) {
      for (let s = 0; s < data.x[b].length; s++) {
        for (let f = 0; f < data.x[b][s].length; f++) {
          const val = data.x[b][s][f];
          if (typeof val !== 'number' || !isFinite(val)) {
            throw new ValidationError(
              `Non-numeric value at [${b}][${s}][${f}]: ${val}`,
              'x',
            );
          }
        }
      }
    }
  }

  /**
   * Convert any value to array format
   */
  private static toArray(data: unknown): unknown[] {
    if (Array.isArray(data)) {
      return data;
    }
    if (typeof data === 'string') {
      try {
        const parsed: unknown = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Not JSON
      }
    }
    throw new ValidationError(
      'Input must be an array or JSON array string',
      'x',
    );
  }
}