# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**faim-n8n** is a production-ready n8n node that integrates FAIM's time-series forecasting API. It supports three forecasting models (Chronos2, FlowState, TiRex) and provides flexible input handling for 1D/2D/3D array formats with automatic normalization.

**Key Stats**: ~1,500 lines of TypeScript code, 1,500+ lines of documentation, 4 example workflows, 12+ unit tests passing.

---

## Essential Commands

### Development
```bash
pnpm install                    # Install dependencies (required first)
pnpm run dev                    # Watch mode - auto-rebuild on changes
pnpm run build                  # Compile TypeScript to dist/
pnpm test                       # Run all unit tests
pnpm test:watch                 # Watch mode for tests
pnpm test:coverage              # Coverage report with thresholds
pnpm run lint                   # ESLint code quality check
pnpm run lint:fix               # Auto-fix linting issues
```

### Testing Specific Tests
```bash
pnpm test -- shapeConverter.test.ts    # Run shape converter tests only
pnpm test -- --testNamePattern="1D"    # Run tests matching pattern
```

### Before Committing
```bash
pnpm run lint:fix               # Fix code style
pnpm run test                   # Run all tests
pnpm run build                  # Verify TypeScript compilation
```

---

## Architecture Overview

### Data Flow Pipeline
```
n8n Input (1D/2D/3D arrays)
  ↓
ShapeConverter.normalize()       [src/data/shapeConverter.ts]
  ↓ (converts to standard 3D format)
RequestBuilder.build()           [src/api/requestBuilder.ts]
  ↓ (validates parameters, builds request)
ArrowSerializer.serialize()      [src/arrow/serializer.ts]
  ↓ (converts to Arrow IPC binary)
ForecastClient.forecast()        [src/api/forecastClient.ts]
  ↓ (handles HTTP, retries, timeouts)
Parse response → ForecastResponse object
  ↓
Return to n8n workflow
```

### Core Modules

**1. ShapeConverter** (`src/data/shapeConverter.ts` - 224 lines)
- Normalizes 1D/2D/3D arrays to standard 3D format: `[batch][sequence][features]`
- Auto-detects input type and converts accordingly
- Validation: Max 50M elements, numeric values only, consistent dimensions
- Example: `[10, 11, 12]` → `[[[10], [11], [12]]]`

**2. RequestBuilder** (`src/api/requestBuilder.ts` - 168 lines)
- Assembles API request with validation
- Model validation: chronos2, flowstate, tirex (1-1000 horizon)
- Model-specific parameters:
  - Chronos2: Quantiles for confidence intervals
  - FlowState: Scale factor, prediction type
  - TiRex: No additional parameters
- Bearer token authentication setup

**3. ForecastClient** (`src/api/forecastClient.ts` - 242 lines)
- HTTP client with automatic retry logic
- Exponential backoff: 2s, 4s, 8s (+ jitter), max 3 retries
- Retryable errors: Network timeouts, 503/504, resource exhaustion
- Non-retryable: 401 (auth), 422 (validation), 404 (not found)
- Configurable: timeout (default 30s), maxRetries (default 3)

**4. Error Handling** (`src/errors/`)
- 9 custom error types: ValidationError, TimeoutError, PayloadTooLargeError, etc.
- Each error has: code, statusCode, retryable flag, user-friendly message
- ErrorHandler maps HTTP status codes to FaimError instances
- Contextual error messages for n8n UI

**5. n8n Node** (`src/nodes/FAIMForecast/`)
- FAIMForecast.node.ts: INodeType implementation with UI parameters
- FAIMForecast.credentials.ts: Credential type for secure API key storage
- Supports n8n expressions: `{{ $json.myData }}`, `{{ JSON.stringify([1,2,3]) }}`

---

## Key Implementation Details

### Input Normalization
All input formats auto-convert to 3D:
- `[1, 2, 3]` (1D) → shape: (1, 3, 1) - 1 batch, 3 steps, 1 feature
- `[[1,2], [3,4]]` (2D) → shape: (1, 2, 2) - 1 batch, 2 steps, 2 features
- `[[[1,2]], [[3,4]]]` (3D) → shape: (2, 1, 2) - 2 batches, 1 step, 2 features

Validation rejects:
- Non-numeric values (null, NaN, Infinity, strings)
- Empty arrays
- Inconsistent dimensions (jagged arrays)
- Payloads > 50M elements

### Retry Strategy
```
Attempt 1: Initial request
  ↓ (Fails with retryable error)
Attempt 2: Wait 2000ms + jitter, Retry
Attempt 3: Wait 4000ms + jitter, Retry
Attempt 4: Wait 8000ms + jitter, Retry
Max: 4 total attempts (1 initial + 3 retries)
Non-retryable errors fail immediately
```

### API Request Structure
```typescript
POST /v1/ts/forecast/{model}/{version}
Authorization: Bearer {apiKey}
Content-Type: application/vnd.apache.arrow.stream
Content-Length: {bytes}

[Arrow IPC binary stream]
```

### Response Format
```typescript
{
  forecast: {
    point?: number[][][],         // [batch][horizon][features]
    quantiles?: number[][][],     // Alternative output
    samples?: number[][][]        // Alternative output
  },
  metadata: {
    modelName: string,
    modelVersion: string,
    transactionId?: string,
    costAmount?: string,
    costCurrency?: string,
    inputShape: { batch, sequence, features },
    outputShape: { batch, horizon, features }
  },
  executionStats: {
    durationMs: number,
    retryCount: number,
    batchSize: number
  }
}
```

---

## Testing Strategy

### Test Framework
- **Jest** (29.5) with **ts-jest** for TypeScript support
- Tests in `/tests/` directory, matching `**/*.test.ts` pattern
- Coverage targets: 70%+ branches, functions, lines, statements
- Test timeout: 10 seconds

### Current Tests
- `shapeConverter.test.ts`: Data normalization edge cases (1D/2D/3D conversion, validation)
- `requestBuilder.test.ts`: Request assembly, parameter validation, model compatibility

### Writing New Tests
```typescript
import { ShapeConverter } from '../src/data/shapeConverter';

describe('ShapeConverter', () => {
  it('should normalize 1D array', () => {
    const result = ShapeConverter.normalize([1, 2, 3]);
    expect(result.x).toEqual([[[1], [2], [3]]]);
    expect(result.batchSize).toBe(1);
    expect(result.sequenceLength).toBe(3);
    expect(result.features).toBe(1);
  });

  it('should reject non-numeric values', () => {
    expect(() => ShapeConverter.normalize([1, null, 3])).toThrow();
  });
});
```

### Coverage Report
```bash
pnpm test:coverage
# Generates coverage/ directory with HTML report
```

---

## Type Safety Standards

**Enforced by TypeScript strict mode**:
- All function returns must be explicitly typed
- No implicit `any` variables
- Strict null checks
- No unused variables/parameters

**Example - Good**:
```typescript
async function forecast(model: string, data: unknown): Promise<ForecastResponse> {
  const normalized: NormalizedData = ShapeConverter.normalize(data);
  return await this.client.forecast(model, normalized);
}
```

**Example - Bad** (will fail linting):
```typescript
async function forecast(model, data) {  // ❌ No types
  return this.client.forecast(model, data);  // ❌ No return type
}
```

---

## Project Structure

```
src/
├── index.ts                         # Public API exports
├── nodes/FAIMForecast/
│   ├── FAIMForecast.node.ts         # n8n node definition (INodeType)
│   ├── FAIMForecast.credentials.ts  # Credential type
│   └── faim.svg                     # Node icon
├── api/
│   ├── forecastClient.ts            # HTTP client + retry logic
│   └── requestBuilder.ts            # API request assembly
├── data/
│   └── shapeConverter.ts            # Input normalization
├── arrow/
│   └── serializer.ts                # Arrow IPC serialization
└── errors/
    ├── customErrors.ts              # 9 custom error classes
    └── errorHandler.ts              # HTTP status → FaimError mapping

tests/
├── setup.ts                         # Jest configuration
├── shapeConverter.test.ts           # Normalization tests
└── requestBuilder.test.ts           # Request assembly tests

examples/                            # 4 ready-to-import n8n workflows
├── chronos2-simple-forecast.json
├── flowstate-with-parameters.json
├── chronos2-quantiles-confidence.json
└── batch-processing-multiple-series.json

dist/                                # Compiled JavaScript (generated)
.github/workflows/
├── ci.yml                           # GitHub Actions CI/CD
└── publish.yml                      # npm publishing on main push
```

---

## Configuration Files

### package.json
- **Main entry**: `dist/index.js` (compiled TypeScript)
- **Types**: `dist/index.d.ts` (generated type definitions)
- **Peer dependencies**: n8n-core, n8n-workflow
- **Package manager**: pnpm@10.20.0 (frozen lockfile via pnpm-lock.yaml)

### tsconfig.json
- **Target**: ES2020
- **Module**: CommonJS
- **Strict mode**: Enabled (all checks)
- **Declaration**: Generates .d.ts files with source maps
- **Outdir**: `./dist`

### .eslintrc.json
- TypeScript-eslint recommended rules
- No explicit `any` (error)
- No floating promises (error)
- No unused variables (error)
- Console.log restricted (warning)

### jest.config.js
- **Preset**: ts-jest
- **Environment**: node
- **Coverage thresholds**: 70% minimum
- **Test timeout**: 10 seconds

---

## n8n Integration

### How n8n Loads the Node
1. Looks in `node_modules/@faim-group/n8n-nodes-faim`
2. Reads `package.json` → `main` field → `dist/index.js`
3. Imports exported classes implementing `INodeType` and `ICredentialType`
4. Registers node in UI automatically

### Credential Vault Security
- API key stored in n8n's encrypted database
- Never logged or exposed in error messages
- Only accessible during node execution
- HTTPS required for all API calls

### Expression Support in Node Parameters
Users can use n8n expressions in input fields:
```
{{ $json.timeSeries }}
{{ $json.data[0] }}
{{ JSON.stringify([1, 2, 3]) }}
{{ $node["HTTP Request"].json.data }}
```

### Node Output Structure
Accessible in downstream nodes via `$json`:
```
$json.forecast.point          // Forecast values
$json.metadata.costAmount     // API cost
$json.metadata.modelName      // Model used
$json.executionStats          // Performance metrics
```

---

## Common Development Tasks

### Add a New Error Type
1. Define in `src/errors/customErrors.ts` extending `FaimError`
2. Export from `src/index.ts`
3. Add mapping in `src/errors/errorHandler.ts` if HTTP-based
4. Add test case in `tests/`

### Add a New Model Parameter
1. Update `RequestBuilder.buildMetadata()` in `src/api/requestBuilder.ts`
2. Add UI field to `FAIMForecast.node.ts` in properties array
3. Update `README.md` and `EXAMPLES.md`
4. Add test in `tests/requestBuilder.test.ts`

### Fix a Bug
1. Write a failing test that reproduces the issue
2. Fix the implementation
3. Run `pnpm test` to verify the test now passes
4. Run `pnpm run lint:fix` before committing

### Improve Data Validation
1. Add validation logic to `src/data/shapeConverter.ts`
2. Add test cases to `tests/shapeConverter.test.ts`
3. Update error message in `src/errors/errorHandler.ts`
4. Update `README.md` troubleshooting section

---

## Dependencies

### Production (3 core)
- `apache-arrow` (v14.0.0) - Binary serialization format
- `axios` (v1.6.0) - HTTP client with timeout/retry support
- `pako` (v2.1.0) - Optional compression support

### Development
- `typescript` (5.0) - TypeScript compiler with strict mode
- `jest` (29.5), `ts-jest` (29.1) - Testing framework
- `@typescript-eslint/*` (5+) - Linting for TypeScript
- `@types/node` (20+), `@types/jest` (29.5) - Type definitions

---

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/ci.yml`)

**On every push/PR**:
1. Checkout code
2. Setup Node.js (18.x and 20.x matrix)
3. Install dependencies (frozen lockfile)
4. Lint with ESLint
5. Build TypeScript
6. Run tests with coverage
7. Upload to Codecov

**On main branch push (after tests pass)**:
1. Build project
2. Publish to npm with `NPM_TOKEN` secret
3. No manual publish needed

**Required secret**: `NPM_TOKEN` (set in GitHub repository settings)

---

## Build and Distribution

### Local Build
```bash
pnpm run build
# Outputs to dist/ with source maps and .d.ts files
```

### Before Publishing
```bash
pnpm run lint:fix               # Fix style
pnpm run test                   # All tests pass
pnpm run build                  # TypeScript compiles
npm publish --access public     # (handled by CI/CD)
```

### npm Package Structure
```
dist/
├── index.js                 # Main entry point
├── index.d.ts               # Type definitions
├── index.js.map             # Source map
├── nodes/FAIMForecast/
│   ├── FAIMForecast.node.js
│   ├── FAIMForecast.node.d.ts
│   └── ...
├── api/, arrow/, data/, errors/
│   └── [compiled modules]
└── [source maps]
```

---

## Important Patterns

### Error Handling Pattern
**Always classify errors as retryable or non-retryable**:
```typescript
throw new ValidationError(
  'Invalid input data',
  'NON_NUMERIC_VALUE',
  422,  // HTTP status
  false // Not retryable - fail immediately
);
```

### Type Assertions
For unknown values from external sources, use type guards:
```typescript
// ❌ Don't do this
const model = (response as any).modelName;

// ✅ Do this
if (typeof response?.modelName === 'string') {
  const model: string = response.modelName;
} else {
  throw new Error('Invalid response structure');
}
```

### Testing Edge Cases
- Empty inputs
- Boundary values (1 element, max size)
- Invalid types (null, undefined, objects)
- Inconsistent data (jagged arrays)

---

## References

**Key Files for Different Tasks**:
- **Adding features**: `src/nodes/FAIMForecast/FAIMForecast.node.ts` (UI) + relevant module
- **Fixing data bugs**: `src/data/shapeConverter.ts` + `tests/shapeConverter.test.ts`
- **Fixing API bugs**: `src/api/forecastClient.ts` or `requestBuilder.ts`
- **Error messages**: `src/errors/errorHandler.ts`
- **Testing**: Add to appropriate test file, keep test name descriptive

**Documentation to Consult**:
- `README.md` - Complete user guide and feature documentation
- `EXAMPLES.md` - 4 workflow examples with detailed explanations
- `DEVELOPMENT.md` - Developer setup and contribution guidelines
- `QUICKSTART.md` - 5-minute quick start guide
- `PROJECT_SUMMARY.md` - Project overview and release checklist

---

## Quality Standards

Before submitting code:
- ✅ Linting passes: `pnpm run lint:fix`
- ✅ Tests pass: `pnpm test` (all tests)
- ✅ Builds successfully: `pnpm run build`
- ✅ New features have tests
- ✅ No `console.log()` statements (use proper logging)
- ✅ All functions have explicit return types
- ✅ No implicit `any` variables
- ✅ Error messages are user-friendly
- python sdk for FAIM on the relative path: ../faim-client; backend: ../backend; the server which meets clients first on backend - proxy-server ../backend/proxy-server


### Serialization and deserialization logic on the backend
  Key Arrow Serialization Logic from Python SDK:

  SERIALIZE (serialize_to_arrow):
  1. Flatten arrays: Use arr.ravel() to flatten to 1D (this is crucial - creates a view if C-contiguous)
  2. Field metadata: Store shape and dtype as JSON in field metadata (as bytes with b"shape", b"dtype")
  3. Arrow field creation: pa.field(name, pa.from_numpy_dtype(arr.dtype), metadata=field_meta)
  4. Arrow array creation: pa.array(flattened, type=pa_field.type, from_pandas=True)
  5. Record batch: pa.record_batch(cols, schema=schema) - takes columns array and schema
  6. Schema metadata: Store user_meta as JSON bytes in schema metadata
  7. IPC stream: Use pa.ipc.new_stream(sink, schema, options=write_options) with writer.write_batch(batch)
  8. Return: bytes from sink

  DESERIALIZE (deserialize_from_arrow):
  1. Read stream: pa.ipc.open_stream(pa.py_buffer(arrow_bytes))
  2. Read all batches: table = reader.read_all()
  3. Extract columns: col_chunked = table.column(i) → arr_np = col_chunked.to_numpy(zero_copy_only=False)
  4. Reshape: Use field metadata b"shape" and b"dtype" to reconstruct
  5. Extract metadata: From table.schema.metadata[b"user_meta"]

  Critical insight: The metadata keys are bytes, not strings! They use b"shape", b"dtype", b"user_meta".

  For details: check the ../faim-client/faim_sdk/utils.py

### To check the official documentation of global services always use context7 tool
- when u need to find somehting in the documentation of any service/tool - use context7 to fetch the actual information