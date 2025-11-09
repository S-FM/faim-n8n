import { ValidationError } from '../errors/customErrors';

export type InputFormat = '1d' | '2d' | '3d';

export interface NormalizedData {
  x: number[][][]; // 3D array: (batch, sequence, features)
  batchSize: number;
  sequenceLength: number;
  features: number;
  inputFormat: InputFormat; // Track original input format for output reshaping
}

/**
 * Converts various input formats to 3D numpy-like array structure
 * Required format: (batch_size, sequence_length, features)
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
   * Convert 2D array to 3D
   * Case 1: [[v1, v2], [v3, v4]] → [[[v1, v2], [v3, v4]]]
   *         batch_size=1, sequence_length=n, features=2
   * Case 2: [[v1], [v2], ...] → [[[v1], [v2], ...]]
   *         batch_size=1, sequence_length=n, features=1
   */
  private static from2D(data: number[][]): NormalizedData {
    if (data.length === 0) {
      throw new ValidationError('Input array cannot be empty');
    }

    const sequenceLength = data.length;
    const features = Array.isArray(data[0]) ? data[0].length : 1;

    // Ensure all rows have same length
    for (let i = 0; i < data.length; i++) {
      if (!Array.isArray(data[i])) {
        throw new ValidationError(
          `Row ${i} is not an array`,
          'x',
        );
      }
      if (data[i].length !== features) {
        throw new ValidationError(
          `Inconsistent row length at index ${i}: expected ${features}, got ${data[i].length}`,
          'x',
        );
      }
    }

    return {
      x: [data],
      batchSize: 1,
      sequenceLength,
      features,
      inputFormat: '2d',
    };
  }

  /**
   * Validate 3D array structure
   */
  private static from3D(data: number[][][]): NormalizedData {
    if (data.length === 0) {
      throw new ValidationError('Input array cannot be empty');
    }

    const batchSize = data.length;
    const sequenceLength = data[0].length;
    const features = data[0][0].length;

    // Validate all batches have consistent shape
    for (let b = 0; b < data.length; b++) {
      if (!Array.isArray(data[b])) {
        throw new ValidationError(
          `Batch ${b} is not an array`,
          'x',
        );
      }
      if (data[b].length !== sequenceLength) {
        throw new ValidationError(
          `Batch ${b} has inconsistent sequence length: expected ${sequenceLength}, got ${data[b].length}`,
          'x',
        );
      }
      for (let s = 0; s < sequenceLength; s++) {
        if (!Array.isArray(data[b][s])) {
          throw new ValidationError(
            `Batch ${b}, sequence ${s} is not an array`,
            'x',
          );
        }
        if (data[b][s].length !== features) {
          throw new ValidationError(
            `Batch ${b}, sequence ${s} has inconsistent features: expected ${features}, got ${data[b][s].length}`,
            'x',
          );
        }
      }
    }

    return {
      x: data,
      batchSize,
      sequenceLength,
      features,
      inputFormat: '3d',
    };
  }

  /**
   * Validate normalized data against constraints
   */
  private static validate(data: NormalizedData): void {
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