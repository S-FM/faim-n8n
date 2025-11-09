import { InputFormat } from './shapeConverter';

/**
 * Converts backend 3D forecast output back to the original n8n node input format
 *
 * The FAIM backend always processes data in 3D format: (batch, sequence, features).
 * For the n8n node, we restrict to univariate data (features=1) and reshape outputs
 * back to the user's original input dimensions.
 *
 * Supported input formats (univariate only):
 * - 1D: user provides [v1, v2, ...] → backend processes as (1, n, 1) →
 *   Point output (1, h, 1) reshaped to (h)
 *   Quantiles output (1, h, q, 1) reshaped to (h, q)
 *   Samples output (1, h, s, 1) reshaped to (h, s)
 *
 * - 2D: user provides [[v1], [v2], ...] → backend processes as (m, n, 1) →
 *   Point output (m, h, 1) reshaped to (m, h)
 *   Quantiles output (m, h, q, 1) reshaped to (m, h, q)
 *   Samples output (m, h, s, 1) reshaped to (m, h, s)
 *
 * Note: All outputs have features dimension = 1, so we always extract the last index [0]
 * from the features axis to match user expectations.
 */
export class ShapeReshaper {
  /**
   * Reshape point forecast from backend format back to user input format
   *
   * Backend returns: (batch, horizon, features=1)
   * Transforms based on original input format:
   * - 1D: (1, h, 1) → extract [0][*][0] to get (h)
   * - 2D: (m, h, 1) → extract [*][*][0] to get (m, h)
   *
   * Note: Backend may return feature values as arrays [value] or objects {"0": value}.
   * This method handles both formats transparently.
   *
   * @param forecast - 3D array from backend: (batch, horizon, features)
   * @param inputFormat - Original input format ('1d' or '2d')
   * @returns Reshaped array matching original input format
   * @throws Error if forecast shape is invalid
   */
  static reshapePointForecast(
    forecast: number[][][],
    inputFormat: InputFormat,
  ): number[] | number[][] {
    this.validatePointShape(forecast);

    // Helper function to extract feature value from array or object format
    const extractFeatureValue = (featureContainer: unknown): number => {
      if (Array.isArray(featureContainer) && featureContainer.length > 0) {
        const value = (featureContainer as unknown[])[0];
        if (typeof value === 'number') {
          return value;
        }
      }
      // Handle object format {"0": value, ...}
      if (typeof featureContainer === 'object' && featureContainer !== null && !Array.isArray(featureContainer)) {
        const values = Object.values(featureContainer as Record<string, unknown>);
        if (values.length > 0) {
          const firstValue = values[0];
          if (typeof firstValue === 'number') {
            return firstValue;
          }
        }
      }
      throw new Error(
        `Invalid feature format: expected array [value] or object {"0": value}, got ${JSON.stringify(featureContainer)}`
      );
    };

    if (inputFormat === '1d') {
      // 1D input: extract first batch and remove features dimension
      // (1, h, 1) → (h)
      return forecast[0].map((timestep) => extractFeatureValue(timestep));
    }

    // 2D input: remove features dimension from all batches
    // (m, h, 1) → (m, h)
    return forecast.map((batch) => batch.map((timestep) => extractFeatureValue(timestep)));
  }

  /**
   * Reshape quantiles forecast from backend format back to user input format
   *
   * Backend returns: (batch, horizon, quantiles, features=1)
   * Transforms based on original input format:
   * - 1D: (1, h, q, 1) → extract [0][*][*][0] to get (h, q)
   * - 2D: (m, h, q, 1) → extract [*][*][*][0] to get (m, h, q)
   *
   * Note: Backend may return feature values as arrays [value] or objects {"0": value}.
   * This method handles both formats transparently.
   *
   * @param forecast - 4D array from backend: (batch, horizon, quantiles, features)
   * @param inputFormat - Original input format ('1d' or '2d')
   * @returns Reshaped array matching original input format
   * @throws Error if forecast shape is invalid
   */
  static reshapeQuantilesForecast(
    forecast: unknown,
    inputFormat: InputFormat,
  ): number[][] | number[][][] {
    // Type guard and validation
    if (!Array.isArray(forecast) || forecast.length === 0) {
      throw new Error('Invalid quantiles forecast: expected non-empty array');
    }

    const forecast4d = forecast as number[][][][];
    this.validateQuantilesShape(forecast4d);

    // Helper function to extract feature value from array or object format
    const extractFeatureValue = (featureContainer: unknown): number => {
      if (Array.isArray(featureContainer) && featureContainer.length > 0) {
        const value = (featureContainer as unknown[])[0];
        if (typeof value === 'number') {
          return value;
        }
      }
      // Handle object format {"0": value, ...}
      if (typeof featureContainer === 'object' && featureContainer !== null && !Array.isArray(featureContainer)) {
        const values = Object.values(featureContainer as Record<string, unknown>);
        if (values.length > 0) {
          const firstValue = values[0];
          if (typeof firstValue === 'number') {
            return firstValue;
          }
        }
      }
      throw new Error(
        `Invalid feature format: expected array [value] or object {"0": value}, got ${JSON.stringify(featureContainer)}`
      );
    };

    if (inputFormat === '1d') {
      // 1D input: extract first batch and remove features dimension
      // (1, h, q, 1) → (h, q)
      const batch = forecast4d[0];
      return batch.map((timestep) =>
        timestep.map((quantile) => extractFeatureValue(quantile))
      );
    }

    // 2D input: remove features dimension from all batches
    // (m, h, q, 1) → (m, h, q)
    return forecast4d.map((batch) =>
      batch.map((timestep) =>
        timestep.map((quantile) => extractFeatureValue(quantile))
      )
    );
  }

  /**
   * Reshape samples forecast from backend format back to user input format
   *
   * Backend returns: (batch, horizon, samples, features=1)
   * Transforms based on original input format:
   * - 1D: (1, h, s, 1) → extract [0][*][*][0] to get (h, s)
   * - 2D: (m, h, s, 1) → extract [*][*][*][0] to get (m, h, s)
   *
   * Note: Backend may return feature values as arrays [value] or objects {"0": value}.
   * This method handles both formats transparently.
   *
   * @param forecast - 4D array from backend: (batch, horizon, samples, features)
   * @param inputFormat - Original input format ('1d' or '2d')
   * @returns Reshaped array matching original input format
   * @throws Error if forecast shape is invalid
   */
  static reshapeSamplesForecast(
    forecast: unknown,
    inputFormat: InputFormat,
  ): number[][] | number[][][] {
    // Type guard and validation
    if (!Array.isArray(forecast) || forecast.length === 0) {
      throw new Error('Invalid samples forecast: expected non-empty array');
    }

    const forecast4d = forecast as number[][][][];
    this.validateSamplesShape(forecast4d);

    // Helper function to extract feature value from array or object format
    const extractFeatureValue = (featureContainer: unknown): number => {
      if (Array.isArray(featureContainer) && featureContainer.length > 0) {
        const value = (featureContainer as unknown[])[0];
        if (typeof value === 'number') {
          return value;
        }
      }
      // Handle object format {"0": value, ...}
      if (typeof featureContainer === 'object' && featureContainer !== null && !Array.isArray(featureContainer)) {
        const values = Object.values(featureContainer as Record<string, unknown>);
        if (values.length > 0) {
          const firstValue = values[0];
          if (typeof firstValue === 'number') {
            return firstValue;
          }
        }
      }
      throw new Error(
        `Invalid feature format: expected array [value] or object {"0": value}, got ${JSON.stringify(featureContainer)}`
      );
    };

    if (inputFormat === '1d') {
      // 1D input: extract first batch and remove features dimension
      // (1, h, s, 1) → (h, s)
      const batch = forecast4d[0];
      return batch.map((timestep) =>
        timestep.map((sample) => extractFeatureValue(sample))
      );
    }

    // 2D input: remove features dimension from all batches
    // (m, h, s, 1) → (m, h, s)
    return forecast4d.map((batch) =>
      batch.map((timestep) =>
        timestep.map((sample) => extractFeatureValue(sample))
      )
    );
  }

  /**
   * Validate point forecast shape
   *
   * Expected: 3D array with features=1
   * Shape: (batch, horizon, 1)
   *
   * Note: Feature dimension may be array [value] or object {"0": value}.
   * This validates the structure without rejecting either format.
   *
   * @throws Error if shape is invalid
   */
  private static validatePointShape(forecast: unknown): void {
    if (!Array.isArray(forecast) || forecast.length === 0) {
      throw new Error('Point forecast: empty batch dimension');
    }

    const batch = (forecast as unknown[])[0];
    if (!Array.isArray(batch) || batch.length === 0) {
      throw new Error('Point forecast: empty horizon dimension');
    }

    const timestep = (batch as unknown[])[0];

    // Check if timestep is a number (2D array instead of 3D)
    if (typeof timestep === 'number') {
      throw new Error(
        'Point forecast: received 2D array instead of 3D. Expected shape (batch, horizon, features=1)'
      );
    }

    // Accept either array or object format for features
    if (Array.isArray(timestep)) {
      if (timestep.length !== 1) {
        throw new Error(
          `Point forecast: expected features=1, got features=${timestep.length}`
        );
      }
    } else if (typeof timestep === 'object' && timestep !== null && !Array.isArray(timestep)) {
      // Object format {"0": value} is acceptable
      const objectValues: unknown[] = Object.values(timestep as Record<string, unknown>);
      if (objectValues.length !== 1) {
        throw new Error(
          `Point forecast: expected features=1, got features=${objectValues.length}`
        );
      }
    } else {
      throw new Error(
        `Point forecast: invalid timestep type: ${typeof timestep}. Expected array [value] or object {"0": value} but got ${JSON.stringify(timestep)}`
      );
    }
  }

  /**
   * Validate quantiles forecast shape
   *
   * Expected: 4D array with features=1
   * Shape: (batch, horizon, quantiles, 1)
   *
   * Note: Feature dimension may be array [value] or object {"0": value}.
   * This validates the structure without rejecting either format.
   *
   * @throws Error if shape is invalid
   */
  private static validateQuantilesShape(forecast: number[][][][]): void {
    if (forecast?.length === 0) {
      throw new Error('Quantiles forecast: empty batch dimension');
    }

    const batch = forecast?.[0];
    if (!Array.isArray(batch) || batch.length === 0) {
      throw new Error('Quantiles forecast: empty horizon dimension');
    }

    const timestep = batch[0];
    if (!Array.isArray(timestep) || timestep.length === 0) {
      throw new Error('Quantiles forecast: empty quantiles dimension');
    }

    const quantile = timestep[0];

    // Accept either array or object format for features
    if (Array.isArray(quantile)) {
      if (quantile.length !== 1) {
        throw new Error(
          `Quantiles forecast: expected features=1, got features=${quantile.length}`
        );
      }
    } else if (typeof quantile === 'object' && quantile !== null && !Array.isArray(quantile)) {
      // Object format {"0": value} is acceptable
      const objectValues: unknown[] = Object.values(quantile as Record<string, unknown>);
      if (objectValues.length !== 1) {
        throw new Error(
          `Quantiles forecast: expected features=1, got features=${objectValues.length}`
        );
      }
    } else {
      throw new Error(
        `Quantiles forecast: invalid quantile type. Expected array [value] or object {"0": value}`
      );
    }
  }

  /**
   * Validate samples forecast shape
   *
   * Expected: 4D array with features=1
   * Shape: (batch, horizon, samples, 1)
   *
   * Note: Feature dimension may be array [value] or object {"0": value}.
   * This validates the structure without rejecting either format.
   *
   * @throws Error if shape is invalid
   */
  private static validateSamplesShape(forecast: number[][][][]): void {
    if (forecast?.length === 0) {
      throw new Error('Samples forecast: empty batch dimension');
    }

    const batch = forecast?.[0];
    if (!Array.isArray(batch) || batch.length === 0) {
      throw new Error('Samples forecast: empty horizon dimension');
    }

    const timestep = batch[0];
    if (!Array.isArray(timestep) || timestep.length === 0) {
      throw new Error('Samples forecast: empty samples dimension');
    }

    const sample = timestep[0];

    // Accept either array or object format for features
    if (Array.isArray(sample)) {
      if (sample.length !== 1) {
        throw new Error(
          `Samples forecast: expected features=1, got features=${sample.length}`
        );
      }
    } else if (typeof sample === 'object' && sample !== null && !Array.isArray(sample)) {
      // Object format {"0": value} is acceptable
      const objectValues: unknown[] = Object.values(sample as Record<string, unknown>);
      if (objectValues.length !== 1) {
        throw new Error(
          `Samples forecast: expected features=1, got features=${objectValues.length}`
        );
      }
    } else {
      throw new Error(
        `Samples forecast: invalid sample type. Expected array [value] or object {"0": value}`
      );
    }
  }
}