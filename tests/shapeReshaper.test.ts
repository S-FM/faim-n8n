import { ShapeReshaper } from '../src/data/shapeReshaper';

describe('ShapeReshaper', () => {
  describe('reshapePointForecast', () => {
    it('should reshape 1D input point forecast from (1,h,1) to (h)', () => {
      // Input was [1,2,3], normalized to (1,3,1)
      // Backend returns (1, horizon, 1)
      const backendOutput: number[][][] = [
        [[10], [11], [12], [13]], // horizon=4
      ];

      const result = ShapeReshaper.reshapePointForecast(backendOutput, '1d');

      expect(result).toEqual([10, 11, 12, 13]);
      expect(Array.isArray(result)).toBe(true);
      expect((result as number[]).length).toBe(4);
    });

    it('should reshape 2D input point forecast from (b,h,1) to (b,h)', () => {
      // Input was [[1,2], [3,4]], normalized to (1,2,2)
      // But with 2 batches: input (2,2), normalized to (2,2,1)
      // Backend returns (2, horizon, 1)
      const backendOutput: number[][][] = [
        [[10], [11], [12]], // batch 1, horizon=3
        [[20], [21], [22]], // batch 2, horizon=3
      ];

      const result = ShapeReshaper.reshapePointForecast(backendOutput, '2d');

      expect(result).toEqual([
        [10, 11, 12],
        [20, 21, 22],
      ]);
      expect((result as number[][]).length).toBe(2);
      expect((result as number[][])[0].length).toBe(3);
    });

    it('should keep 3D input point forecast as (b,h,f)', () => {
      // Input was (2, 3, 2), stays as (2, 3, 2)
      // Backend returns (2, horizon=4, 2)
      const backendOutput: number[][][] = [
        [[10, 11], [12, 13], [14, 15], [16, 17]], // batch 1
        [[20, 21], [22, 23], [24, 25], [26, 27]], // batch 2
      ];

      const result = ShapeReshaper.reshapePointForecast(backendOutput, '3d');

      expect(result).toEqual(backendOutput);
      expect((result as number[][][]).length).toBe(2);
    });
  });

  describe('reshapeQuantilesForecast', () => {
    it('should reshape 1D input quantiles forecast from (1,h,q,1) to (h,q)', () => {
      // Input was [1,2,3], normalized to (1,3,1)
      // Backend returns (1, horizon=2, quantiles=3, 1)
      const backendOutput: number[][][][] = [
        [
          [[0.1], [0.5], [0.9]], // horizon 0
          [[1.1], [1.5], [1.9]], // horizon 1
        ],
      ];

      const result = ShapeReshaper.reshapeQuantilesForecast(backendOutput, '1d');

      expect(result).toEqual([
        [0.1, 0.5, 0.9],
        [1.1, 1.5, 1.9],
      ]);
      expect((result as number[][]).length).toBe(2);
      expect((result as number[][])[0].length).toBe(3);
    });

    it('should reshape 2D input quantiles forecast from (b,h,q,1) to (b,h,q)', () => {
      // Input was (2, 2), normalized to (2, 2, 1)
      // Backend returns (2, horizon=2, quantiles=2, 1)
      const backendOutput: number[][][][] = [
        [
          [[0.1], [0.9]], // batch 0, horizon 0
          [[1.1], [1.9]], // batch 0, horizon 1
        ],
        [
          [[2.1], [2.9]], // batch 1, horizon 0
          [[3.1], [3.9]], // batch 1, horizon 1
        ],
      ];

      const result = ShapeReshaper.reshapeQuantilesForecast(backendOutput, '2d');

      expect(result).toEqual([
        [
          [0.1, 0.9],
          [1.1, 1.9],
        ],
        [
          [2.1, 2.9],
          [3.1, 3.9],
        ],
      ]);
      expect((result as number[][][]).length).toBe(2);
      expect((result as number[][][])[0].length).toBe(2);
      expect((result as number[][][])[0][0].length).toBe(2);
    });

    it('should keep 3D input quantiles forecast as (b,h,q,f)', () => {
      // Input was (2, 3, 2), stays as (2, 3, 2)
      // Backend returns (2, horizon=2, quantiles=2, 2)
      const backendOutput: number[][][][] = [
        [
          [[0.1, 0.2], [0.9, 1.8]], // batch 0, horizon 0
          [[1.1, 1.2], [1.9, 2.8]], // batch 0, horizon 1
        ],
        [
          [[2.1, 2.2], [2.9, 3.8]], // batch 1, horizon 0
          [[3.1, 3.2], [3.9, 4.8]], // batch 1, horizon 1
        ],
      ];

      const result = ShapeReshaper.reshapeQuantilesForecast(backendOutput, '3d');

      expect(result).toEqual(backendOutput);
      expect((result as number[][][][]).length).toBe(2);
    });
  });

  describe('reshapeSamplesForecast', () => {
    it('should reshape 1D input samples forecast from (1,h,s,1) to (h,s)', () => {
      // Input was [1,2,3], normalized to (1,3,1)
      // Backend returns (1, horizon=2, samples=3, 1)
      const backendOutput: number[][][][] = [
        [
          [[0.1], [0.2], [0.3]], // horizon 0
          [[1.1], [1.2], [1.3]], // horizon 1
        ],
      ];

      const result = ShapeReshaper.reshapeSamplesForecast(backendOutput, '1d');

      expect(result).toEqual([
        [0.1, 0.2, 0.3],
        [1.1, 1.2, 1.3],
      ]);
      expect((result as number[][]).length).toBe(2);
      expect((result as number[][])[0].length).toBe(3);
    });

    it('should reshape 2D input samples forecast from (b,h,s,1) to (b,h,s)', () => {
      // Input was (2, 2), normalized to (2, 2, 1)
      // Backend returns (2, horizon=2, samples=2, 1)
      const backendOutput: number[][][][] = [
        [
          [[0.1], [0.9]], // batch 0, horizon 0
          [[1.1], [1.9]], // batch 0, horizon 1
        ],
        [
          [[2.1], [2.9]], // batch 1, horizon 0
          [[3.1], [3.9]], // batch 1, horizon 1
        ],
      ];

      const result = ShapeReshaper.reshapeSamplesForecast(backendOutput, '2d');

      expect(result).toEqual([
        [
          [0.1, 0.9],
          [1.1, 1.9],
        ],
        [
          [2.1, 2.9],
          [3.1, 3.9],
        ],
      ]);
      expect((result as number[][][]).length).toBe(2);
    });

    it('should keep 3D input samples forecast as (b,h,s,f)', () => {
      // Input was (2, 3, 2), stays as (2, 3, 2)
      // Backend returns (2, horizon=2, samples=2, 2)
      const backendOutput: number[][][][] = [
        [
          [[0.1, 0.2], [0.9, 1.8]], // batch 0, horizon 0
          [[1.1, 1.2], [1.9, 2.8]], // batch 0, horizon 1
        ],
        [
          [[2.1, 2.2], [2.9, 3.8]], // batch 1, horizon 0
          [[3.1, 3.2], [3.9, 4.8]], // batch 1, horizon 1
        ],
      ];

      const result = ShapeReshaper.reshapeSamplesForecast(backendOutput, '3d');

      expect(result).toEqual(backendOutput);
      expect((result as number[][][][]).length).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle single horizon step in 1D point forecast', () => {
      const backendOutput: number[][][] = [[[42]]]; // 1 batch, 1 horizon step, 1 feature
      const result = ShapeReshaper.reshapePointForecast(backendOutput, '1d');
      expect(result).toEqual([42]);
    });

    it('should handle single batch in 2D point forecast', () => {
      const backendOutput: number[][][] = [[[10], [20], [30]]]; // 1 batch, 3 horizon steps
      const result = ShapeReshaper.reshapePointForecast(backendOutput, '2d');
      expect(result).toEqual([[10, 20, 30]]);
    });

    it('should handle multiple features in 3D point forecast', () => {
      const backendOutput: number[][][] = [
        [[1, 2, 3], [4, 5, 6]], // 1 batch, 2 horizon steps, 3 features
      ];
      const result = ShapeReshaper.reshapePointForecast(backendOutput, '3d');
      expect(result).toEqual(backendOutput);
    });

    it('should handle single horizon step in 1D quantile forecast', () => {
      // Input: [1], normalized to (1,1,1), returns (1,1,3,1) with 3 quantiles
      const backendOutput: number[][][][] = [
        [
          [[0.5], [0.7], [0.9]], // Single horizon step, 3 quantiles
        ],
      ];

      const result = ShapeReshaper.reshapeQuantilesForecast(backendOutput, '1d');

      expect(result).toEqual([[0.5, 0.7, 0.9]]);
      expect((result as number[][]).length).toBe(1);
      expect((result as number[][])[0].length).toBe(3);
    });

    it('should handle single quantile in 1D quantile forecast', () => {
      // Single quantile (just median)
      const backendOutput: number[][][][] = [
        [
          [[0.5]], // horizon 0, 1 quantile
          [[0.6]], // horizon 1, 1 quantile
        ],
      ];

      const result = ShapeReshaper.reshapeQuantilesForecast(backendOutput, '1d');

      expect(result).toEqual([[0.5], [0.6]]);
      expect((result as number[][]).length).toBe(2);
      expect((result as number[][])[0].length).toBe(1);
    });

    it('should handle many quantiles in 1D forecast', () => {
      // 10 quantiles for forecasting percentiles
      const backendOutput: number[][][][] = [
        [
          [
            [0.1],
            [0.2],
            [0.3],
            [0.4],
            [0.5],
            [0.6],
            [0.7],
            [0.8],
            [0.9],
            [1.0],
          ], // horizon 0, 10 quantiles
        ],
      ];

      const result = ShapeReshaper.reshapeQuantilesForecast(backendOutput, '1d');

      expect(result).toEqual([[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]]);
      expect((result as number[][])[0].length).toBe(10);
    });

    it('should handle 2D quantile forecast with single batch', () => {
      const backendOutput: number[][][][] = [
        [
          [[0.1], [0.5], [0.9]], // batch 0, horizon 0
          [[1.1], [1.5], [1.9]], // batch 0, horizon 1
        ],
      ];

      const result = ShapeReshaper.reshapeQuantilesForecast(backendOutput, '2d');

      expect(result).toEqual([
        [
          [0.1, 0.5, 0.9],
          [1.1, 1.5, 1.9],
        ],
      ]);
      expect((result as number[][][]).length).toBe(1);
      expect((result as number[][][])[0][0].length).toBe(3);
    });

    it('should handle 1D samples forecast with many samples', () => {
      // 100 samples for uncertainty quantification
      const samples: number[][][] = [];
      for (let h = 0; h < 2; h++) {
        const horizonSamples: number[][] = [];
        for (let s = 0; s < 100; s++) {
          horizonSamples.push([Math.random()]);
        }
        samples.push(horizonSamples);
      }

      const backendOutput: number[][][][] = [samples];

      const result = ShapeReshaper.reshapeSamplesForecast(backendOutput, '1d');

      expect((result as number[][]).length).toBe(2);
      expect((result as number[][])[0].length).toBe(100);
    });
  });

  describe('Quantile-specific validations', () => {
    it('should correctly reshape 1D quantile forecast with asymmetric quantiles', () => {
      // Asymmetric: more lower quantiles for downside risk analysis
      const backendOutput: number[][][][] = [
        [
          [[0.01], [0.05], [0.1], [0.5], [0.9]], // horizon 0, quantiles: 1%, 5%, 10%, 50%, 90%
          [[0.02], [0.06], [0.11], [0.51], [0.91]], // horizon 1
        ],
      ];

      const result = ShapeReshaper.reshapeQuantilesForecast(backendOutput, '1d');

      expect(result).toEqual([
        [0.01, 0.05, 0.1, 0.5, 0.9],
        [0.02, 0.06, 0.11, 0.51, 0.91],
      ]);
    });

    it('should handle 3D quantile forecast with multiple features and quantiles', () => {
      const backendOutput: number[][][][] = [
        [
          [
            [0.1, 1.1],
            [0.5, 1.5],
          ], // batch 0, horizon 0: 2 features, 2 quantiles
          [
            [0.2, 1.2],
            [0.6, 1.6],
          ], // batch 0, horizon 1
        ],
        [
          [
            [2.1, 3.1],
            [2.5, 3.5],
          ], // batch 1, horizon 0
          [
            [2.2, 3.2],
            [2.6, 3.6],
          ], // batch 1, horizon 1
        ],
      ];

      const result = ShapeReshaper.reshapeQuantilesForecast(backendOutput, '3d');

      expect(result).toEqual(backendOutput);
      expect((result as number[][][][]).length).toBe(2); // 2 batches
      expect((result as number[][][][])[0].length).toBe(2); // 2 horizons
      expect((result as number[][][][])[0][0].length).toBe(2); // 2 quantiles
      expect((result as number[][][][])[0][0][0].length).toBe(2); // 2 features
    });
  });
});