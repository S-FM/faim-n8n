import { ShapeConverter } from '../src/data/shapeConverter';
import { ValidationError } from '../src/errors/customErrors';

describe('ShapeConverter', () => {
  describe('normalize', () => {
    it('should convert 1D array correctly', () => {
      const data = [1, 2, 3, 4, 5];
      const result = ShapeConverter.normalize(data);

      expect(result.batchSize).toBe(1);
      expect(result.sequenceLength).toBe(5);
      expect(result.features).toBe(1);
      expect(result.x).toHaveLength(1);
      expect(result.x[0]).toHaveLength(5);
      expect(result.x[0][0]).toHaveLength(1);
      expect(result.x[0][0][0]).toBe(1);
    });

    it('should convert 2D array correctly', () => {
      const data = [[100, 200], [101, 202], [102, 204]];
      const result = ShapeConverter.normalize(data);

      expect(result.batchSize).toBe(1);
      expect(result.sequenceLength).toBe(3);
      expect(result.features).toBe(2);
      expect(result.x[0][0][0]).toBe(100);
      expect(result.x[0][0][1]).toBe(200);
    });

    it('should convert 3D array correctly', () => {
      const data = [[[10, 20], [11, 21]], [[100, 200], [101, 201]]];
      const result = ShapeConverter.normalize(data);

      expect(result.batchSize).toBe(2);
      expect(result.sequenceLength).toBe(2);
      expect(result.features).toBe(2);
      expect(result.x[0][0][0]).toBe(10);
      expect(result.x[1][0][0]).toBe(100);
    });

    it('should reject empty array', () => {
      expect(() => ShapeConverter.normalize([])).toThrow(ValidationError);
    });

    it('should reject non-numeric values', () => {
      expect(() => ShapeConverter.normalize([1, 'two', 3])).toThrow(
        ValidationError,
      );
    });

    it('should reject null values', () => {
      expect(() => ShapeConverter.normalize([1, null as unknown as number, 3])).toThrow(
        ValidationError,
      );
    });

    it('should reject 2D array with inconsistent row lengths', () => {
      expect(() => ShapeConverter.normalize([[1, 2], [3]])).toThrow(
        ValidationError,
      );
    });
  });
});