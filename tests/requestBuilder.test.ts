import { RequestBuilder } from '../src/api/requestBuilder';
import { ValidationError } from '../src/errors/customErrors';

describe('RequestBuilder', () => {
  const normalizedData = {
    batchSize: 1,
    sequenceLength: 5,
    features: 1,
    x: [[[1], [2], [3], [4], [5]]],
    inputFormat: '1d' as const,
  };

  const baseUrl = 'https://api.faim.it.com';
  const apiKey = 'sk-test-key-123';

  describe('build', () => {
    it('should build valid request for chronos2 model', () => {
      const request = RequestBuilder.build(
        {
          model: 'chronos2',
          modelVersion: '1',
          data: normalizedData,
          horizon: 10,
          outputType: 'point',
          parameters: {},
        },
        apiKey,
        baseUrl,
      );

      expect(request.url).toBe('https://api.faim.it.com/v1/ts/forecast/chronos2/1');
      expect(request.headers['Authorization']).toBe('Bearer sk-test-key-123');
      expect(request.headers['Content-Type']).toContain('application/vnd.apache.arrow.stream');
      expect(request.body).toBeInstanceOf(Uint8Array);
    });

    it('should build valid request for chronos2 with quantiles', () => {
      const request = RequestBuilder.build(
        {
          model: 'chronos2',
          modelVersion: '1',
          data: normalizedData,
          horizon: 24,
          outputType: 'quantiles',
          parameters: {
            quantiles: [0.1, 0.5, 0.9],
          },
        },
        apiKey,
        baseUrl,
      );

      expect(request.url).toBe('https://api.faim.it.com/v1/ts/forecast/chronos2/1');
      expect(request.headers['Authorization']).toBe('Bearer sk-test-key-123');
      expect(request.body).toBeInstanceOf(Uint8Array);
    });

    it('should validate horizon is within bounds', () => {
      expect(() =>
        RequestBuilder.build(
          {
            model: 'chronos2',
            modelVersion: '1',
            data: normalizedData,
            horizon: 0,
            outputType: 'point',
            parameters: {},
          },
          apiKey,
          baseUrl,
        ),
      ).toThrow(ValidationError);

      expect(() =>
        RequestBuilder.build(
          {
            model: 'chronos2',
            modelVersion: '1',
            data: normalizedData,
            horizon: 1001,
            outputType: 'point',
            parameters: {},
          },
          apiKey,
          baseUrl,
        ),
      ).toThrow(ValidationError);
    });

    it('should reject invalid models (only chronos2 is supported)', () => {
      expect(() =>
        RequestBuilder.build(
          {
            model: 'flowstate' as any,
            modelVersion: '1',
            data: normalizedData,
            horizon: 10,
            outputType: 'point',
            parameters: {},
          },
          apiKey,
          baseUrl,
        ),
      ).toThrow(ValidationError);

      expect(() =>
        RequestBuilder.build(
          {
            model: 'tirex' as any,
            modelVersion: '1',
            data: normalizedData,
            horizon: 10,
            outputType: 'point',
            parameters: {},
          },
          apiKey,
          baseUrl,
        ),
      ).toThrow(ValidationError);

      expect(() =>
        RequestBuilder.build(
          {
            model: 'invalid-model' as any,
            modelVersion: '1',
            data: normalizedData,
            horizon: 10,
            outputType: 'point',
            parameters: {},
          },
          apiKey,
          baseUrl,
        ),
      ).toThrow(ValidationError);
    });

    it('should include Bearer token in headers', () => {
      const request = RequestBuilder.build(
        {
          model: 'chronos2',
          modelVersion: '1',
          data: normalizedData,
          horizon: 10,
          outputType: 'point',
          parameters: {},
        },
        'sk-custom-key',
        baseUrl,
      );

      expect(request.headers['Authorization']).toBe('Bearer sk-custom-key');
    });

    it('should support quantiles output type with custom quantiles array', () => {
      const request = RequestBuilder.build(
        {
          model: 'chronos2',
          modelVersion: '1',
          data: normalizedData,
          horizon: 10,
          outputType: 'quantiles',
          parameters: {
            quantiles: [0.05, 0.25, 0.5, 0.75, 0.95],
          },
        },
        apiKey,
        baseUrl,
      );

      expect(request.url).toBe('https://api.faim.it.com/v1/ts/forecast/chronos2/1');
      expect(request.headers['Authorization']).toBe(`Bearer ${apiKey}`);
      expect(request.body).toBeInstanceOf(Uint8Array);
    });

    it('should support quantiles with minimal parameters (2-quantile)', () => {
      const request = RequestBuilder.build(
        {
          model: 'chronos2',
          modelVersion: '1',
          data: normalizedData,
          horizon: 5,
          outputType: 'quantiles',
          parameters: {
            quantiles: [0.25, 0.75],
          },
        },
        apiKey,
        baseUrl,
      );

      expect(request.url).toContain('/chronos2/');
      expect(request.body).toBeInstanceOf(Uint8Array);
    });

    it('should build valid request for samples output type', () => {
      const request = RequestBuilder.build(
        {
          model: 'chronos2',
          modelVersion: '1',
          data: normalizedData,
          horizon: 10,
          outputType: 'samples',
          parameters: {},
        },
        apiKey,
        baseUrl,
      );

      expect(request.url).toBe('https://api.faim.it.com/v1/ts/forecast/chronos2/1');
      expect(request.headers['Authorization']).toBe('Bearer sk-test-key-123');
      expect(request.body).toBeInstanceOf(Uint8Array);
    });

    it('should accept quantiles as request parameter (backend validates range)', () => {
      // Note: Quantile validation (0-1 range) happens on the backend
      const request = RequestBuilder.build(
        {
          model: 'chronos2',
          modelVersion: '1',
          data: normalizedData,
          horizon: 10,
          outputType: 'quantiles',
          parameters: {
            quantiles: [0.5, 0.95], // Valid quantiles
          },
        },
        apiKey,
        baseUrl,
      );

      expect(request.url).toContain('/chronos2/');
      expect(request.body).toBeInstanceOf(Uint8Array);
    });

    it('should handle large horizon with quantiles', () => {
      const request = RequestBuilder.build(
        {
          model: 'chronos2',
          modelVersion: '1',
          data: normalizedData,
          horizon: 1000,
          outputType: 'quantiles',
          parameters: {
            quantiles: [0.1, 0.5, 0.9],
          },
        },
        apiKey,
        baseUrl,
      );

      expect(request.url).toContain('/chronos2/');
      expect(request.body).toBeInstanceOf(Uint8Array);
    });
  });
});