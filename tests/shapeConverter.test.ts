import { ShapeConverter } from '../src/data/shapeConverter';
import { ValidationError } from '../src/errors/customErrors';

describe('ShapeConverter', () => {
  describe('normalize - Valid 1D Inputs', () => {
    it('should convert simple 1D array [1,2,3]', () => {
      const data = [1, 2, 3];
      const result = ShapeConverter.normalize(data);

      expect(result.batchSize).toBe(1);
      expect(result.sequenceLength).toBe(3);
      expect(result.features).toBe(1);
      expect(result.inputFormat).toBe('1d');
      expect(result.x).toEqual([[[1], [2], [3]]]);
    });

    it('should convert 1D array with 5 elements', () => {
      const data = [1, 2, 3, 4, 5];
      const result = ShapeConverter.normalize(data);

      expect(result.batchSize).toBe(1);
      expect(result.sequenceLength).toBe(5);
      expect(result.features).toBe(1);
      expect(result.inputFormat).toBe('1d');
      expect(result.x[0]).toHaveLength(5);
      expect(result.x[0][0][0]).toBe(1);
      expect(result.x[0][4][0]).toBe(5);
    });

    it('should convert 1D array with single element', () => {
      const data = [42];
      const result = ShapeConverter.normalize(data);

      expect(result.batchSize).toBe(1);
      expect(result.sequenceLength).toBe(1);
      expect(result.features).toBe(1);
      expect(result.x).toEqual([[[42]]]);
    });

    it('should handle 1D array with negative numbers', () => {
      const data = [-10, -5, 0, 5, 10];
      const result = ShapeConverter.normalize(data);

      expect(result.x[0][0][0]).toBe(-10);
      expect(result.x[0][2][0]).toBe(0);
      expect(result.x[0][4][0]).toBe(10);
    });

    it('should handle 1D array with floating point numbers', () => {
      const data = [1.5, 2.7, 3.14159];
      const result = ShapeConverter.normalize(data);

      expect(result.x[0][0][0]).toBeCloseTo(1.5);
      expect(result.x[0][1][0]).toBeCloseTo(2.7);
      expect(result.x[0][2][0]).toBeCloseTo(3.14159);
    });

    it('should handle 1D array with very large numbers', () => {
      const data = [1e10, 2e10, 3e10];
      const result = ShapeConverter.normalize(data);

      expect(result.x[0][0][0]).toBe(1e10);
      expect(result.x[0][2][0]).toBe(3e10);
    });

    it('should handle 1D array with very small numbers', () => {
      const data = [1e-10, 2e-10, 3e-10];
      const result = ShapeConverter.normalize(data);

      expect(result.x[0][0][0]).toBeCloseTo(1e-10);
    });
  });

  describe('normalize - Valid 2D Univariate Inputs', () => {
    it('should convert 2D batch of 3 univariate series, each 1 timestep', () => {
      // 2D format: rows = series, columns = timesteps
      // [[100], [101], [102]] = 3 series, 1 timestep each
      const data = [[100], [101], [102]];
      const result = ShapeConverter.normalize(data);

      expect(result.batchSize).toBe(3);
      expect(result.sequenceLength).toBe(1);
      expect(result.features).toBe(1);
      expect(result.inputFormat).toBe('2d');
      expect(result.x).toEqual([[[100]], [[101]], [[102]]]);
    });

    it('should convert 2D batch of 1 univariate series with 1 timestep', () => {
      const data = [[42]];
      const result = ShapeConverter.normalize(data);

      expect(result.batchSize).toBe(1);
      expect(result.sequenceLength).toBe(1);
      expect(result.features).toBe(1);
      expect(result.x).toEqual([[[42]]]);
    });

    it('should handle 2D batch of 3 series with 3 timesteps each', () => {
      const data = [[-10.5, 0, 10.5], [20, 21, 22], [30, 31, 32]];
      const result = ShapeConverter.normalize(data);

      expect(result.batchSize).toBe(3);
      expect(result.sequenceLength).toBe(3);
      expect(result.features).toBe(1);
      expect(result.x[0][0][0]).toBeCloseTo(-10.5);
      expect(result.x[0][1][0]).toBe(0);
      expect(result.x[0][2][0]).toBeCloseTo(10.5);
      expect(result.x[1][0][0]).toBe(20);
      expect(result.x[2][2][0]).toBe(32);
    });

    it('should handle large 2D batch array', () => {
      // 5 series, 100 timesteps each
      const data = Array.from({ length: 5 }, (_, seriesIdx) =>
        Array.from({ length: 100 }, (_, timeIdx) => seriesIdx * 100 + timeIdx)
      );
      const result = ShapeConverter.normalize(data);

      expect(result.batchSize).toBe(5);
      expect(result.sequenceLength).toBe(100);
      expect(result.features).toBe(1);
      expect(result.x[0][0][0]).toBe(0);
      expect(result.x[0][99][0]).toBe(99);
      expect(result.x[4][0][0]).toBe(400);
      expect(result.x[4][99][0]).toBe(499);
    });
  });

  describe('normalize - Invalid Inputs (Dimension Errors)', () => {
    it('should reject 3D array input', () => {
      const data = [[[10, 20], [11, 21]], [[100, 200], [101, 201]]];
      expect(() => ShapeConverter.normalize(data)).toThrow(
        'Multivariate forecasting is not yet supported'
      );
    });

    it('should reject 3D array with clear error message', () => {
      const data = [[[1, 2]]];
      expect(() => ShapeConverter.normalize(data)).toThrow(
        /3D multivariate input detected/
      );
    });

    it('should accept 2D array (now interpreted as batch × sequence)', () => {
      // [[100, 200], [101, 202], [102, 204]] is now interpreted as:
      // 3 series × 2 timesteps (not 3 timesteps × 2 features as before)
      // batchSize=3, sequenceLength=2, features=1 (univariate)
      const data = [[100, 200], [101, 202], [102, 204]];
      const result = ShapeConverter.normalize(data);

      expect(result.batchSize).toBe(3);
      expect(result.sequenceLength).toBe(2);
      expect(result.features).toBe(1);
    });

    it('should accept 2D array interpreted as batch processing', () => {
      // [[1, 2, 3], [4, 5, 6]] = 2 series, 3 timesteps each
      // batchSize=2, sequenceLength=3, features=1
      const data = [[1, 2, 3], [4, 5, 6]];
      const result = ShapeConverter.normalize(data);

      expect(result.batchSize).toBe(2);
      expect(result.sequenceLength).toBe(3);
      expect(result.features).toBe(1);
    });

    it('should reject empty 1D array', () => {
      expect(() => ShapeConverter.normalize([])).toThrow('Input array cannot be empty');
    });

    it('should reject empty 2D array', () => {
      const data = [[]];
      expect(() => ShapeConverter.normalize(data)).toThrow(ValidationError);
    });

    it('should reject deeply nested 4D array', () => {
      const data = [[[[1]]]];
      expect(() => ShapeConverter.normalize(data)).toThrow(ValidationError);
    });
  });

  describe('normalize - Invalid Inputs (Data Type Errors)', () => {
    it('should reject 1D array with string value', () => {
      const data = [1, 'two', 3];
      expect(() => ShapeConverter.normalize(data)).toThrow(ValidationError);
    });

    it('should reject 1D array with null value', () => {
      const data = [1, null as unknown as number, 3];
      expect(() => ShapeConverter.normalize(data)).toThrow(
        'Non-numeric value'
      );
    });

    it('should reject 1D array with undefined value', () => {
      const data = [1, undefined as unknown as number, 3];
      expect(() => ShapeConverter.normalize(data)).toThrow(ValidationError);
    });

    it('should reject 1D array with NaN value', () => {
      const data = [1, NaN, 3];
      expect(() => ShapeConverter.normalize(data)).toThrow(
        'Non-numeric value'
      );
    });

    it('should reject 1D array with Infinity value', () => {
      const data = [1, Infinity, 3];
      expect(() => ShapeConverter.normalize(data)).toThrow(
        'Non-numeric value'
      );
    });

    it('should reject 1D array with -Infinity value', () => {
      const data = [1, -Infinity, 3];
      expect(() => ShapeConverter.normalize(data)).toThrow(
        'Non-numeric value'
      );
    });

    it('should reject 2D array with mixed valid/invalid types', () => {
      const data = [[1], [null as unknown as number]];
      expect(() => ShapeConverter.normalize(data)).toThrow(ValidationError);
    });

    it('should reject 2D array with boolean value', () => {
      const data = [[1], [true as unknown as number]];
      expect(() => ShapeConverter.normalize(data)).toThrow(ValidationError);
    });

    it('should reject 2D array with object value', () => {
      const data = [[1], [{} as unknown as number]];
      expect(() => ShapeConverter.normalize(data)).toThrow(ValidationError);
    });
  });

  describe('normalize - Invalid Inputs (Structural Errors)', () => {
    it('should reject 2D array with inconsistent row lengths', () => {
      const data = [[1], [2, 3]];
      expect(() => ShapeConverter.normalize(data)).toThrow(
        'Inconsistent row length'
      );
    });

    it('should reject 2D array with second row shorter', () => {
      const data = [[1, 2, 3], [4, 5]];
      expect(() => ShapeConverter.normalize(data)).toThrow(ValidationError);
    });

    it('should reject 2D array with non-array row', () => {
      const data = [[1], 2 as unknown as number[]];
      expect(() => ShapeConverter.normalize(data)).toThrow(
        'Row 1 is not an array'
      );
    });

    it('should reject jagged 2D array (inconsistent nesting)', () => {
      const data = [[1], [2], [3, 4]];
      expect(() => ShapeConverter.normalize(data)).toThrow(ValidationError);
    });
  });

  describe('normalize - Invalid Input Format (Not Array)', () => {
    it('should reject null input', () => {
      expect(() => ShapeConverter.normalize(null)).toThrow('Input data is required');
    });

    it('should reject undefined input', () => {
      expect(() => ShapeConverter.normalize(undefined)).toThrow('Input data is required');
    });

    it('should reject string input (non-JSON)', () => {
      expect(() => ShapeConverter.normalize('not-json-array')).toThrow(
        'Input must be an array or JSON array string'
      );
    });

    it('should reject number input', () => {
      expect(() => ShapeConverter.normalize(42)).toThrow(
        'Input must be an array or JSON array string'
      );
    });

    it('should reject object input', () => {
      expect(() => ShapeConverter.normalize({ data: [1, 2, 3] })).toThrow(
        'Input must be an array or JSON array string'
      );
    });

    it('should accept JSON string representation of array', () => {
      const result = ShapeConverter.normalize('[1, 2, 3]');
      expect(result.sequenceLength).toBe(3);
      expect(result.x).toEqual([[[1], [2], [3]]]);
    });

    it('should accept JSON string representation of 2D array', () => {
      const result = ShapeConverter.normalize('[[100], [101], [102]]');
      expect(result.batchSize).toBe(3);  // 3 rows
      expect(result.sequenceLength).toBe(1);  // 1 column per row
      expect(result.features).toBe(1);
    });
  });

  describe('normalize - Boundary Cases', () => {
    it('should handle array with maximum safe integer', () => {
      const data = [Number.MAX_SAFE_INTEGER];
      const result = ShapeConverter.normalize(data);
      expect(result.x[0][0][0]).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle array with minimum safe integer', () => {
      const data = [Number.MIN_SAFE_INTEGER];
      const result = ShapeConverter.normalize(data);
      expect(result.x[0][0][0]).toBe(Number.MIN_SAFE_INTEGER);
    });

    it('should handle array with minimum positive number', () => {
      const data = [Number.MIN_VALUE];
      const result = ShapeConverter.normalize(data);
      expect(result.x[0][0][0]).toBe(Number.MIN_VALUE);
    });

    it('should handle array with zero', () => {
      const data = [0, 0, 0];
      const result = ShapeConverter.normalize(data);
      expect(result.x[0][0][0]).toBe(0);
      expect(result.x[0][1][0]).toBe(0);
      expect(result.x[0][2][0]).toBe(0);
    });

    it('should handle array with negative zero', () => {
      const data = [-0];
      const result = ShapeConverter.normalize(data);
      expect(result.x[0][0][0]).toBe(-0);
    });
  });

  describe('normalize - Return Value Validation', () => {
    it('should always return object with required fields', () => {
      const result = ShapeConverter.normalize([1, 2, 3]);

      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('batchSize');
      expect(result).toHaveProperty('sequenceLength');
      expect(result).toHaveProperty('features');
      expect(result).toHaveProperty('inputFormat');
    });

    it('should return correct types for all fields', () => {
      const result = ShapeConverter.normalize([1, 2, 3]);

      expect(Array.isArray(result.x)).toBe(true);
      expect(typeof result.batchSize).toBe('number');
      expect(typeof result.sequenceLength).toBe('number');
      expect(typeof result.features).toBe('number');
      expect(typeof result.inputFormat).toBe('string');
    });

    it('should always have features = 1 for valid input', () => {
      const result1D = ShapeConverter.normalize([1, 2, 3]);
      const result2D = ShapeConverter.normalize([[1], [2], [3]]);

      expect(result1D.features).toBe(1);
      expect(result2D.features).toBe(1);
    });

    it('should have batchSize = 1 for 1D input', () => {
      const result1D = ShapeConverter.normalize([1, 2, 3]);
      expect(result1D.batchSize).toBe(1);
    });

    it('should have batchSize = number of rows for 2D input', () => {
      const result2D = ShapeConverter.normalize([[1], [2], [3]]);
      expect(result2D.batchSize).toBe(3);  // 3 rows = 3 series
    });
  });
});