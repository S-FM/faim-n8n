import * as arrow from 'apache-arrow';
import { SerializationError } from '../errors/customErrors';

export interface ArrowData {
  arrays: Record<string, number[] | number[][] | number[][][] | number[][][][]>;
  metadata: Record<string, unknown>;
}

/**
 * Handles Apache Arrow IPC serialization and deserialization
 * Matches the Python SDK implementation using apache-arrow library
 * Based on: faim-client/faim_sdk/utils.py
 */
export class ArrowSerializer {
  /**
   * Serialize arrays and metadata to Arrow IPC stream format
   * Follows Python SDK's serialize_to_arrow implementation exactly
   *
   * Process:
   * 1. Create Arrow fields from arrays with shape/dtype metadata stored in field metadata
   * 2. Flatten multi-dimensional arrays to 1D for Arrow columns
   * 3. Create schema with user metadata
   * 4. Create RecordBatch with schema and vectors
   * 5. Write to IPC stream format using RecordBatchStreamWriter
   */
  static serialize(arrays: Record<string, number[] | number[][] | number[][][]>, metadata?: Record<string, unknown>): Uint8Array {
    try {
      const fields: arrow.Field[] = [];
      const columns: arrow.Vector[] = [];

      // Deterministic order for reproducibility (sorted keys)
      const sortedKeys = Object.keys(arrays).sort();

      if (sortedKeys.length === 0) {
        throw new SerializationError('No arrays provided for serialization');
      }

      for (const name of sortedKeys) {
        let arr: number[] | number[][] | number[][][] = arrays[name];

        // Skip None/undefined values (optional arrays)
        if (arr === null || arr === undefined) {
          continue;
        }

        // Ensure array is 3D: (batch, sequence, features)
        const shape = this.getArrayShape(arr);
        if (shape.length === 1) {
          // 1D -> reshape to (1, length, 1)
          const arr1d = arr as number[];
          arr = [arr1d.map(v => [v])];
        } else if (shape.length === 2) {
          // 2D -> reshape to (1, rows, cols)
          arr = [arr as number[][]];
        }
        // 3D stays as-is

        // Get the 3D shape
        const finalShape = this.getArrayShape(arr);

        // Flatten for Arrow storage
        const flattened = this.flattenArray(arr);

        // Store original shape and dtype in field metadata
        const fieldMetadata = new Map<string, string>();
        fieldMetadata.set('shape', JSON.stringify(finalShape));
        fieldMetadata.set('dtype', 'float64');

        // Create Arrow field WITH metadata
        // NOTE: nullable must be false to match Arrow JS's inferred batches
        const field = new arrow.Field(name, new arrow.Float64(), false, fieldMetadata);
        fields.push(field);

        // Convert flattened array to Arrow vector
        const vector = arrow.vectorFromArray(flattened, new arrow.Float64());
        columns.push(vector);
      }

      // Verify we have data
      if (columns.length === 0 || (columns[0]?.length ?? 0) === 0) {
        throw new SerializationError('Cannot create Arrow batch with 0 rows');
      }

      // Embed user metadata in schema
      // Matches Python: schema_meta = {b"user_meta": json.dumps(metadata or {})}
      const schemaMetadata = new Map<string, string>();
      schemaMetadata.set('user_meta', JSON.stringify(metadata || {}));

      // Create schema with our fields (which have field metadata) and schema metadata
      const mergedMetadata = new Map(schemaMetadata.entries());

      // Create a temporary table to get batches with inferred schema
      const columnDict: Record<string, arrow.Vector> = {};
      for (let i = 0; i < fields.length; i++) {
        columnDict[fields[i].name] = columns[i]!;
      }
      const tempTable = new arrow.Table(columnDict);

      // Recreate fields with metadata by copying from temp table fields and adding our metadata
      // This ensures the field names and types match exactly with the batches
      const fieldsWithMetadata = tempTable.schema.fields.map((tempField, i) => {
        // Find our original field with metadata for this position
        const originalField = fields[i];
        if (typeof originalField !== 'undefined' && originalField.name === tempField.name) {
          // Use our field WITH metadata (same name and type as inferred field)
          return originalField;
        }
        // Find by name
        const matchingField = fields.find(f => f.name === tempField.name);
        if (typeof matchingField !== 'undefined') {
          return matchingField;
        }
        // Fallback: shouldn't happen
        return tempField;
      });

      // Create final schema with our fields (that have metadata) and schema metadata
      const finalSchema = new arrow.Schema(fieldsWithMetadata, mergedMetadata);

      // Wrap the inferred batches with our metadata-rich schema
      const finalTable = new arrow.Table(finalSchema, tempTable.batches);
      const ipcBuffer = arrow.tableToIPC(finalTable, 'stream');

      return ipcBuffer;
    } catch (error) {
      throw new SerializationError(
        `Failed to serialize data to Arrow IPC format: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Deserialize Arrow IPC stream to arrays and metadata
   * Matches Python SDK's deserialize_from_arrow implementation
   */
  static deserialize(buffer: Uint8Array | ArrayBuffer): ArrowData {
    try {
      // Handle ArrayBuffer conversion
      if (buffer instanceof ArrayBuffer) {
        buffer = new Uint8Array(buffer);
      }

      // Open Arrow stream reader and read all batches as a Table
      // Matches Python: reader = pa.ipc.open_stream(pa.py_buffer(arrow_bytes))
      // Use tableFromIPC which gives us a Table with metadata preserved
      // Note: Apache JS tableFromIPC may not support all compression codecs
      const table: arrow.Table = arrow.tableFromIPC(buffer);

      // Extract arrays with shape reconstruction
      const result: Record<string, number[] | number[][] | number[][][] | number[][][][]> = {};

      for (let i = 0; i < table.numCols; i++) {
        const column = table.getChildAt(i);
        if (!column) continue;

        const field = table.schema.fields[i];
        const name = field.name;

        // Convert column to array
        // Matches Python: arr_np = col_chunked.to_numpy(zero_copy_only=False)
        const arr = column.toArray() as number[];

        // Reconstruct original shape from field metadata
        // Matches Python: if field.metadata and b"shape" in field.metadata:
        if (field.metadata?.has('shape')) {
          const shapeMetadata = field.metadata.get('shape');
          if (typeof shapeMetadata === 'string') {
            const shape = JSON.parse(shapeMetadata) as number[];
            const reshaped = this.reshapeArray(arr, shape);
            result[name] = reshaped;
          } else {
            result[name] = arr;
          }
        } else {
          result[name] = arr;
        }
      }

      // Extract user metadata from schema
      // Matches Python: if table.schema.metadata and b"user_meta" in table.schema.metadata:
      let userMetadata: Record<string, unknown> = {};
      if (table.schema.metadata?.has('user_meta')) {
        const userMetaString = table.schema.metadata.get('user_meta');
        if (typeof userMetaString === 'string') {
          userMetadata = JSON.parse(userMetaString) as Record<string, unknown>;
        }
      }

      return {
        arrays: result,
        metadata: userMetadata,
      };
    } catch (error) {
      throw new SerializationError(
        `Failed to deserialize Arrow IPC stream: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get shape of array (supports 1D, 2D, 3D)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static getArrayShape(arr: any): number[] {
    if (!Array.isArray(arr)) {
      return [1]; // Scalar
    }
    if (!Array.isArray(arr[0])) {
      return [arr.length]; // 1D
    }
    if (!Array.isArray(arr[0][0])) {
      return [arr.length, arr[0].length]; // 2D
    }
    // 3D
    return [arr.length, arr[0].length, arr[0][0].length];
  }

  /**
   * Flatten multi-dimensional array to 1D
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static flattenArray(arr: any): number[] {
    const result: number[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flatten = (item: any) => {
      if (Array.isArray(item)) {
        for (const el of item) {
          flatten(el);
        }
      } else {
        result.push(typeof item === 'number' ? item : 0);
      }
    };

    flatten(arr);
    return result;
  }

  /**
   * Reshape 1D array back to original shape
   */
  private static reshapeArray(arr: number[], shape: number[]): number[] | number[][] | number[][][] | number[][][][] {
    if (shape.length === 1) {
      return arr;
    }

    if (shape.length === 2) {
      const [rows, cols] = shape;
      const result: number[][] = [];
      for (let i = 0; i < rows; i++) {
        result.push(arr.slice(i * cols, (i + 1) * cols));
      }
      return result;
    }

    if (shape.length === 3) {
      const [batches, rows, cols] = shape;
      const result: number[][][] = [];
      let idx = 0;
      for (let b = 0; b < batches; b++) {
        const batch: number[][] = [];
        for (let r = 0; r < rows; r++) {
          batch.push(arr.slice(idx, idx + cols));
          idx += cols;
        }
        result.push(batch);
      }
      return result;
    }

    if (shape.length === 4) {
      const [batches, rows, cols, depth] = shape;
      // When depth is 1 (single feature for quantiles/samples), unwrap to 3D
      if (depth === 1) {
        const result: number[][][] = [];
        let idx = 0;
        for (let b = 0; b < batches; b++) {
          const batch: number[][] = [];
          for (let r = 0; r < rows; r++) {
            const row: number[] = [];
            for (let c = 0; c < cols; c++) {
              row.push(arr[idx]);
              idx += 1;
            }
            batch.push(row);
          }
          result.push(batch);
        }
        return result;
      }

      // For depth > 1, keep as 4D
      const result: number[][][][] = [];
      let idx = 0;
      for (let b = 0; b < batches; b++) {
        const batch: number[][][] = [];
        for (let r = 0; r < rows; r++) {
          const row: number[][] = [];
          for (let c = 0; c < cols; c++) {
            row.push(arr.slice(idx, idx + depth));
            idx += depth;
          }
          batch.push(row);
        }
        result.push(batch);
      }
      return result;
    }

    return arr;
  }
}