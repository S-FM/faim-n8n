import { InputFormat } from './shapeConverter';

/**
 * Converts backend 3D output back to the original input format
 *
 * Shape transformation rules:
 * - 1D input (c) → backend processes as (1,c,1) → output (1,h,1) → reshape to (h)
 * - 2D input (b,c) → backend processes as (b,c,1) → output (b,h,1) → reshape to (b,h)
 *   - For quantiles: output (b,h,q,1) → reshape to (b,h,q)
 * - 3D input (b,c,f) → backend processes as (b,c,f) → output (b,h,f) → keep as 3D
 *   - For quantiles: output (b,h,q,f) → keep as 4D
 */
export class ShapeReshaper {
  /**
   * Reshape point forecast output back to original input format
   * Backend always returns (batch, horizon, features)
   */
  static reshapePointForecast(
    forecast: number[][][],
    inputFormat: InputFormat,
  ): number[] | number[][] | number[][][] {
    if (inputFormat === '1d') {
      // Input was (c), output should be (h)
      // Backend returns (1, h, 1), extract [0][*][0]
      return forecast[0].map((timestep) => timestep[0]);
    }

    if (inputFormat === '2d') {
      // Input was (b, c), output should be (b, h)
      // Backend returns (b, h, 1), extract [*][*][0]
      return forecast.map((batch) => batch.map((timestep) => timestep[0]));
    }

    // inputFormat === '3d'
    // Input was (b, c, f), output should be (b, h, f)
    // Backend returns (b, h, f), return as-is
    return forecast;
  }

  /**
   * Reshape quantiles forecast output back to original input format
   * Backend returns either (batch, horizon, quantiles, features) [4D] or
   * (batch, horizon, quantiles) [3D] depending on features=1 optimization
   */
  static reshapeQuantilesForecast(
    forecast: unknown,
    inputFormat: InputFormat,
  ): number[][] | number[][][] | number[][][][] {
    // Validate input
    if (!Array.isArray(forecast) || forecast.length === 0) {
      throw new Error('Invalid quantiles forecast: expected non-empty array');
    }

    // Detect actual dimensionality
    const dims = this.getArrayDimensions(forecast);

    if (dims === 3) {
      // Backend returned (batch, horizon, quantiles) - features dimension was squeezed
      // Treat as (batch, horizon, quantiles, 1) for consistency
      const forecast3d = forecast as number[][][];

      if (inputFormat === '1d') {
        // Extract first batch: [0] to get (horizon, quantiles)
        return forecast3d[0];
      }

      if (inputFormat === '2d') {
        // Keep as-is: (batch, horizon, quantiles)
        return forecast3d;
      }

      // inputFormat === '3d'
      // Expand back to 4D: (batch, horizon, quantiles, 1)
      return forecast3d.map((batch) =>
        batch.map((timestep) => timestep.map((q) => [q])),
      );
    }

    if (dims === 4) {
      // Backend returned (batch, horizon, quantiles, features) [4D]
      const forecast4d = forecast as number[][][][];

      if (inputFormat === '1d') {
        // Input was (c), output should be (h, q)
        // Backend returns (1, h, q, 1), extract [0][*][*][0]
        const batch = forecast4d[0];
        if (!Array.isArray(batch)) {
          throw new Error('Invalid quantiles forecast shape: expected 4D array');
        }
        return batch.map((timestep) => {
          if (!Array.isArray(timestep)) {
            throw new Error('Invalid quantiles forecast shape at timestep');
          }
          return timestep.map((quantile) => {
            if (!Array.isArray(quantile)) {
              throw new Error('Invalid quantiles forecast shape at quantile level');
            }
            return quantile[0];
          });
        });
      }

      if (inputFormat === '2d') {
        // Input was (b, c), output should be (b, h, q)
        // Backend returns (b, h, q, 1), extract [*][*][*][0]
        return forecast4d.map((batch) => {
          if (!Array.isArray(batch)) {
            throw new Error('Invalid quantiles forecast shape: expected 4D array');
          }
          return batch.map((timestep) => {
            if (!Array.isArray(timestep)) {
              throw new Error('Invalid quantiles forecast shape at timestep');
            }
            return timestep.map((quantile) => {
              if (!Array.isArray(quantile)) {
                throw new Error('Invalid quantiles forecast shape at quantile level');
              }
              return quantile[0];
            });
          });
        });
      }

      // inputFormat === '3d'
      // Input was (b, c, f), output should be (b, h, q, f)
      // Backend returns (b, h, q, f), return as-is
      return forecast4d;
    }

    throw new Error(`Unexpected quantiles array dimensionality: ${dims}. Expected 3 or 4.`);
  }

  /**
   * Detect dimensionality of an array
   */
  private static getArrayDimensions(arr: unknown): number {
    if (!Array.isArray(arr) || arr.length === 0) {
      return 0;
    }

    let dims = 1;
    let current: unknown = arr[0];

    while (Array.isArray(current) && current.length > 0) {
      dims++;
      current = current[0];
    }

    return dims;
  }

  /**
   * Reshape samples forecast output back to original input format
   * Backend returns either (batch, horizon, samples, features) [4D] or
   * (batch, horizon, samples) [3D] depending on features=1 optimization
   */
  static reshapeSamplesForecast(
    forecast: unknown,
    inputFormat: InputFormat,
  ): number[][] | number[][][] | number[][][][] {
    // Validate input
    if (!Array.isArray(forecast) || forecast.length === 0) {
      throw new Error('Invalid samples forecast: expected non-empty array');
    }

    // Detect actual dimensionality
    const dims = this.getArrayDimensions(forecast);

    if (dims === 3) {
      // Backend returned (batch, horizon, samples) - features dimension was squeezed
      const forecast3d = forecast as number[][][];

      if (inputFormat === '1d') {
        // Extract first batch: [0] to get (horizon, samples)
        return forecast3d[0];
      }

      if (inputFormat === '2d') {
        // Keep as-is: (batch, horizon, samples)
        return forecast3d;
      }

      // inputFormat === '3d'
      // Expand back to 4D: (batch, horizon, samples, 1)
      return forecast3d.map((batch) =>
        batch.map((timestep) => timestep.map((s) => [s])),
      );
    }

    if (dims === 4) {
      // Backend returned (batch, horizon, samples, features) [4D]
      const forecast4d = forecast as number[][][][];

      if (inputFormat === '1d') {
        // Input was (c), output should be (h, s)
        // Backend returns (1, h, s, 1), extract [0][*][*][0]
        return forecast4d[0].map((timestep) =>
          timestep.map((sample) => {
            if (!Array.isArray(sample)) {
              throw new Error('Invalid samples forecast shape at sample level');
            }
            return sample[0];
          }),
        );
      }

      if (inputFormat === '2d') {
        // Input was (b, c), output should be (b, h, s)
        // Backend returns (b, h, s, 1), extract [*][*][*][0]
        return forecast4d.map((batch) =>
          batch.map((timestep) => timestep.map((sample) => {
            if (!Array.isArray(sample)) {
              throw new Error('Invalid samples forecast shape at sample level');
            }
            return sample[0];
          })),
        );
      }

      // inputFormat === '3d'
      // Input was (b, c, f), output should be (b, h, s, f)
      // Backend returns (b, h, s, f), return as-is
      return forecast4d;
    }

    throw new Error(`Unexpected samples array dimensionality: ${dims}. Expected 3 or 4.`);
  }
}