import { ShapeReshaper } from '../src/data/shapeReshaper';

describe('ShapeReshaper', () => {
  describe('reshapePointForecast - Valid 1D Cases', () => {
    it('should reshape 1D (1,h,1) to (h) - basic case', () => {
      const backendOutput: number[][][] = [[[10], [11], [12], [13]]];
      const result = ShapeReshaper.reshapePointForecast(backendOutput, '1d');

      expect(result).toEqual([10, 11, 12, 13]);
      expect((result as number[]).length).toBe(4);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should reshape 1D (1,h,1) to (h) - single horizon', () => {
      const backendOutput: number[][][] = [[[42]]];
      const result = ShapeReshaper.reshapePointForecast(backendOutput, '1d');

      expect(result).toEqual([42]);
      expect((result as number[]).length).toBe(1);
    });

    it('should reshape 1D (1,h,1) to (h) - large horizon', () => {
      const horizon = Array.from({ length: 100 }, (_, i) => [i]);
      const backendOutput: number[][][] = [horizon];
      const result = ShapeReshaper.reshapePointForecast(backendOutput, '1d');

      expect((result as number[]).length).toBe(100);
      expect((result as number[])[0]).toBe(0);
      expect((result as number[])[99]).toBe(99);
    });

    it('should reshape 1D with negative values', () => {
      const backendOutput: number[][][] = [[[-10], [0], [10]]];
      const result = ShapeReshaper.reshapePointForecast(backendOutput, '1d');

      expect(result).toEqual([-10, 0, 10]);
    });

    it('should reshape 1D with float values', () => {
      const backendOutput: number[][][] = [[[1.5], [2.7], [3.14]]];
      const result = ShapeReshaper.reshapePointForecast(backendOutput, '1d');

      expect((result as number[]).length).toBe(3);
      expect((result as number[])[0]).toBeCloseTo(1.5);
      expect((result as number[])[2]).toBeCloseTo(3.14);
    });
  });

  describe('reshapePointForecast - Valid 2D Cases', () => {
    it('should reshape 2D (b,h,1) to (b,h) - basic case', () => {
      const backendOutput: number[][][] = [
        [[10], [11], [12]],
        [[20], [21], [22]],
      ];
      const result = ShapeReshaper.reshapePointForecast(backendOutput, '2d');

      expect(result).toEqual([
        [10, 11, 12],
        [20, 21, 22],
      ]);
      expect((result as number[][]).length).toBe(2);
      expect((result as number[][])[0].length).toBe(3);
    });

    it('should reshape 2D (b,h,1) to (b,h) - single batch', () => {
      const backendOutput: number[][][] = [[[42]]];
      const result = ShapeReshaper.reshapePointForecast(backendOutput, '2d');

      expect(result).toEqual([[42]]);
    });

    it('should reshape 2D (b,h,1) to (b,h) - multiple batches', () => {
      const backendOutput: number[][][] = [
        [[1], [2], [3]],
        [[4], [5], [6]],
        [[7], [8], [9]],
      ];
      const result = ShapeReshaper.reshapePointForecast(backendOutput, '2d');

      expect((result as number[][]).length).toBe(3);
      expect((result as number[][])[0]).toEqual([1, 2, 3]);
      expect((result as number[][])[2]).toEqual([7, 8, 9]);
    });

    it('should reshape 2D with float values', () => {
      const backendOutput: number[][][] = [
        [[1.1], [2.2]],
        [[3.3], [4.4]],
      ];
      const result = ShapeReshaper.reshapePointForecast(backendOutput, '2d');

      expect((result as number[][])[0][0]).toBeCloseTo(1.1);
      expect((result as number[][])[1][1]).toBeCloseTo(4.4);
    });
  });

  describe('reshapePointForecast - Invalid Cases', () => {
    it('should reject empty batch dimension', () => {
      const backendOutput: number[][][] = [];
      expect(() => ShapeReshaper.reshapePointForecast(backendOutput, '1d')).toThrow(
        'Point forecast: empty batch dimension'
      );
    });

    it('should reject empty horizon dimension', () => {
      const backendOutput: number[][][] = [[]];
      expect(() => ShapeReshaper.reshapePointForecast(backendOutput, '1d')).toThrow(
        'Point forecast: empty horizon dimension'
      );
    });

    it('should reject features != 1', () => {
      const backendOutput: number[][][] = [[[10, 20], [11, 21]]];
      expect(() => ShapeReshaper.reshapePointForecast(backendOutput, '1d')).toThrow(
        'Point forecast: expected features=1'
      );
    });

    it('should reject empty features array', () => {
      const backendOutput: number[][][] = [[[]]];
      expect(() => ShapeReshaper.reshapePointForecast(backendOutput, '1d')).toThrow(
        'Point forecast: expected features=1'
      );
    });
  });

  describe('reshapeQuantilesForecast - Valid 1D Cases', () => {
    it('should reshape 1D (1,h,q,1) to (h,q) - basic case', () => {
      const backendOutput: number[][][][] = [
        [
          [[0.1], [0.5], [0.9]],
          [[1.1], [1.5], [1.9]],
        ],
      ];
      const result = ShapeReshaper.reshapeQuantilesForecast(backendOutput, '1d');

      expect(result).toEqual([
        [0.1, 0.5, 0.9],
        [1.1, 1.5, 1.9],
      ]);
      expect((result as number[][])[0].length).toBe(3);
      expect((result as number[][])[1].length).toBe(3);
    });

    it('should reshape 1D (1,h,q,1) to (h,q) - single horizon', () => {
      const backendOutput: number[][][][] = [
        [
          [[0.1], [0.5], [0.9]],
        ],
      ];
      const result = ShapeReshaper.reshapeQuantilesForecast(backendOutput, '1d');

      expect((result as number[][]).length).toBe(1);
      expect((result as number[][])[0].length).toBe(3);
    });

    it('should reshape 1D with many quantiles', () => {
      const quantiles = Array.from({ length: 10 }, (_, i) => [(i + 1) * 0.1]);
      const backendOutput: number[][][][] = [[quantiles]];
      const result = ShapeReshaper.reshapeQuantilesForecast(backendOutput, '1d');

      expect((result as number[][]).length).toBe(1);
      expect((result as number[][])[0].length).toBe(10);
    });
  });

  describe('reshapeQuantilesForecast - Valid 2D Cases', () => {
    it('should reshape 2D (b,h,q,1) to (b,h,q) - basic case', () => {
      const backendOutput: number[][][][] = [
        [[[0.5], [0.95]]],
        [[[1.5], [1.95]]],
      ];
      const result = ShapeReshaper.reshapeQuantilesForecast(backendOutput, '2d');

      expect(result).toEqual([
        [[0.5, 0.95]],
        [[1.5, 1.95]],
      ]);
      expect((result as number[][][]).length).toBe(2);
      expect((result as number[][][])[0].length).toBe(1);
      expect((result as number[][][])[0][0].length).toBe(2);
    });

    it('should reshape 2D with multiple batches and horizons', () => {
      const backendOutput: number[][][][] = [
        [
          [[0.1], [0.5], [0.9]],
          [[1.1], [1.5], [1.9]],
        ],
        [
          [[2.1], [2.5], [2.9]],
          [[3.1], [3.5], [3.9]],
        ],
      ];
      const result = ShapeReshaper.reshapeQuantilesForecast(backendOutput, '2d');

      expect((result as number[][][]).length).toBe(2);
      expect((result as number[][][])[0].length).toBe(2);
      expect((result as number[][][])[0][0].length).toBe(3);
      expect((result as number[][][])[1][1][2]).toBe(3.9);
    });
  });

  describe('reshapeQuantilesForecast - Invalid Cases', () => {
    it('should reject empty batch dimension', () => {
      const backendOutput: number[][][][] = [];
      expect(() => ShapeReshaper.reshapeQuantilesForecast(backendOutput, '1d')).toThrow(
        'Invalid quantiles forecast: expected non-empty array'
      );
    });

    it('should reject empty input array', () => {
      expect(() => ShapeReshaper.reshapeQuantilesForecast([], '1d')).toThrow(
        'Invalid quantiles forecast: expected non-empty array'
      );
    });

    it('should reject features != 1', () => {
      const backendOutput: number[][][][] = [[[[0.1, 0.2]]]];
      expect(() => ShapeReshaper.reshapeQuantilesForecast(backendOutput, '1d')).toThrow(
        'Quantiles forecast: expected features=1'
      );
    });

    it('should reject empty quantiles dimension', () => {
      const backendOutput: number[][][][] = [[[], []]];
      expect(() => ShapeReshaper.reshapeQuantilesForecast(backendOutput, '1d')).toThrow(
        'Quantiles forecast: empty quantiles dimension'
      );
    });

    it('should reject non-array input', () => {
      expect(() => ShapeReshaper.reshapeQuantilesForecast('not-array', '1d')).toThrow(
        'Invalid quantiles forecast: expected non-empty array'
      );
    });

    it('should reject null input', () => {
      expect(() => ShapeReshaper.reshapeQuantilesForecast(null, '1d')).toThrow();
    });
  });

  describe('reshapeSamplesForecast - Valid 1D Cases', () => {
    it('should reshape 1D (1,h,s,1) to (h,s) - basic case', () => {
      const backendOutput: number[][][][] = [
        [
          [[10], [11]],
          [[12], [13]],
        ],
      ];
      const result = ShapeReshaper.reshapeSamplesForecast(backendOutput, '1d');

      expect(result).toEqual([
        [10, 11],
        [12, 13],
      ]);
      expect((result as number[][])[0].length).toBe(2);
    });

    it('should reshape 1D (1,h,s,1) to (h,s) - single horizon', () => {
      const backendOutput: number[][][][] = [
        [[[1], [2], [3]]],
      ];
      const result = ShapeReshaper.reshapeSamplesForecast(backendOutput, '1d');

      expect(result).toEqual([[1, 2, 3]]);
    });

    it('should reshape 1D with many samples', () => {
      const samples = Array.from({ length: 100 }, (_, i) => [i]);
      const backendOutput: number[][][][] = [[samples]];
      const result = ShapeReshaper.reshapeSamplesForecast(backendOutput, '1d');

      expect((result as number[][])[0].length).toBe(100);
    });
  });

  describe('reshapeSamplesForecast - Valid 2D Cases', () => {
    it('should reshape 2D (b,h,s,1) to (b,h,s) - basic case', () => {
      const backendOutput: number[][][][] = [
        [[[10], [11], [12]]],
        [[[20], [21], [22]]],
      ];
      const result = ShapeReshaper.reshapeSamplesForecast(backendOutput, '2d');

      expect(result).toEqual([
        [[10, 11, 12]],
        [[20, 21, 22]],
      ]);
      expect((result as number[][][]).length).toBe(2);
    });

    it('should reshape 2D with multiple batches and horizons', () => {
      const backendOutput: number[][][][] = [
        [
          [[1], [2]],
          [[3], [4]],
        ],
        [
          [[5], [6]],
          [[7], [8]],
        ],
      ];
      const result = ShapeReshaper.reshapeSamplesForecast(backendOutput, '2d');

      expect((result as number[][][]).length).toBe(2);
      expect((result as number[][][])[0].length).toBe(2);
      expect((result as number[][][])[0][0]).toEqual([1, 2]);
      expect((result as number[][][])[1][1]).toEqual([7, 8]);
    });
  });

  describe('reshapeSamplesForecast - Invalid Cases', () => {
    it('should reject empty input array', () => {
      const backendOutput: number[][][][] = [];
      expect(() => ShapeReshaper.reshapeSamplesForecast(backendOutput, '1d')).toThrow(
        'Invalid samples forecast: expected non-empty array'
      );
    });

    it('should reject empty samples dimension', () => {
      const backendOutput: number[][][][] = [[[], []]];
      expect(() => ShapeReshaper.reshapeSamplesForecast(backendOutput, '1d')).toThrow(
        'Samples forecast: empty samples dimension'
      );
    });

    it('should reject features != 1', () => {
      const backendOutput: number[][][][] = [[[[1, 2]]]];
      expect(() => ShapeReshaper.reshapeSamplesForecast(backendOutput, '1d')).toThrow(
        'Samples forecast: expected features=1'
      );
    });

    it('should reject non-array input', () => {
      expect(() => ShapeReshaper.reshapeSamplesForecast('not-array', '1d')).toThrow(
        'Invalid samples forecast: expected non-empty array'
      );
    });
  });

  describe('Type Safety - Return Values', () => {
    it('1D point forecast returns number array', () => {
      const backendOutput: number[][][] = [[[10], [11], [12]]];
      const result = ShapeReshaper.reshapePointForecast(backendOutput, '1d');

      expect(Array.isArray(result)).toBe(true);
      expect(typeof (result as number[])[0]).toBe('number');
    });

    it('2D point forecast returns 2D number array', () => {
      const backendOutput: number[][][] = [[[10], [11]], [[20], [21]]];
      const result = ShapeReshaper.reshapePointForecast(backendOutput, '2d');

      expect(Array.isArray(result)).toBe(true);
      expect(Array.isArray((result as number[][])[0])).toBe(true);
      expect(typeof (result as number[][])[0][0]).toBe('number');
    });

    it('1D quantiles forecast returns 2D number array', () => {
      const backendOutput: number[][][][] = [
        [[[0.1], [0.5], [0.9]]],
      ];
      const result = ShapeReshaper.reshapeQuantilesForecast(backendOutput, '1d');

      expect(Array.isArray(result)).toBe(true);
      expect(Array.isArray((result as number[][])[0])).toBe(true);
      expect(typeof (result as number[][])[0][0]).toBe('number');
    });

    it('2D quantiles forecast returns 3D number array', () => {
      const backendOutput: number[][][][] = [
        [[[0.1], [0.5]]],
        [[[1.1], [1.5]]],
      ];
      const result = ShapeReshaper.reshapeQuantilesForecast(backendOutput, '2d');

      expect((result as number[][][]).length).toBe(2);
      expect(Array.isArray((result as number[][][])[0])).toBe(true);
      expect(Array.isArray((result as number[][][])[0][0])).toBe(true);
    });
  });
});