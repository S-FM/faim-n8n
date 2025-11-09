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

    it('should build valid request for flowstate model with parameters', () => {
      const request = RequestBuilder.build(
        {
          model: 'flowstate',
          modelVersion: '1',
          data: normalizedData,
          horizon: 24,
          outputType: 'quantiles',
          parameters: {
            scale_factor: 1.5,
            prediction_type: 'quantiles',
          },
        },
        apiKey,
        baseUrl,
      );

      expect(request.url).toBe('https://api.faim.it.com/v1/ts/forecast/flowstate/1');
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

    it('should validate model type', () => {
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
  });
});