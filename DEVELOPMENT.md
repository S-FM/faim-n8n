# Development Guide

This document covers development, testing, and contribution guidelines for the FAIM n8n node.

## Project Structure

```
faim-n8n/
├── src/
│   ├── api/                 # HTTP API client & request building
│   │   ├── forecastClient.ts  # Main client with retry logic
│   │   └── requestBuilder.ts  # Arrow request assembly
│   ├── arrow/               # Apache Arrow serialization
│   │   └── serializer.ts    # IPC format handling
│   ├── data/                # Data processing & validation
│   │   ├── shapeConverter.ts  # 1D/2D/3D normalization
│   │   └── validator.ts     # Input validation
│   ├── errors/              # Error handling
│   │   ├── customErrors.ts  # Error classes
│   │   └── errorHandler.ts  # Error mapping & messages
│   ├── nodes/               # n8n node definitions
│   │   └── FAIMForecast/
│   │       ├── FAIMForecast.node.ts
│   │       ├── FAIMForecast.credentials.ts
│   │       └── faim.svg
│   └── index.ts             # Public exports
├── tests/                   # Test files
│   ├── unit/                # Unit tests by module
│   ├── integration/         # Integration tests
│   ├── fixtures/            # Mock data & responses
│   └── setup.ts             # Test configuration
├── examples/                # Example workflows
├── .github/workflows/       # CI/CD pipelines
├── README.md                # User documentation
├── EXAMPLES.md              # Workflow examples
└── package.json             # Dependencies & scripts
```

## Development Setup

### Prerequisites
- Node.js 18+ or 20+
- pnpm 10.20.0+ (package manager)
- n8n instance (for local testing)

### Installation

```bash
# Install dependencies
pnpm install

# Watch mode (auto-rebuild on changes)
pnpm run dev

# Build once
pnpm run build

# Run tests
pnpm run test

# Watch tests
pnpm run test:watch

# Coverage report
pnpm run test:coverage

# Lint code
pnpm run lint

# Fix linting issues
pnpm run lint:fix
```

## Architecture

### Data Flow
```
n8n Input Data
    ↓
ShapeConverter (normalize 1D/2D/3D)
    ↓
RequestBuilder (validate & prepare)
    ↓
ArrowSerializer (IPC format)
    ↓
ForecastClient (HTTP + retry logic)
    ↓
API Response (Arrow IPC)
    ↓
ArrowSerializer (deserialize)
    ↓
n8n Output JSON
```

### Error Handling Strategy

1. **Validation errors** (422): Fail immediately with clear field-level messages
2. **Auth errors** (401): Fail immediately with credential message
3. **Resource errors** (413, 404): Fail immediately with specific guidance
4. **Transient errors** (503, 504): Retry with exponential backoff (2s, 4s, 8s)
5. **Server errors** (500): Determine if retryable based on error code

See `src/errors/errorHandler.ts` for error mapping.

### Retry Logic

```
Request
  ↓
Failed?
  ├─ Retryable error → Sleep (exponential backoff + jitter)
  │                     ↓
  │                  Retry (max 3 times)
  └─ Non-retryable   → Throw immediately
```

## Testing

### Unit Tests
Test individual modules in isolation:

```bash
# Test shape converter
pnpm test -- data/shapeConverter.test.ts

# Test error handling
pnpm test -- errors/errorHandler.test.ts

# Run all unit tests
pnpm test -- src/
```

### Integration Tests
Test API interaction with mocked responses:

```bash
pnpm test -- tests/integration/
```

### Test Coverage
Target 80%+ coverage:

```bash
pnpm run test:coverage
```

Current coverage status tracked in CI/CD.

## Key Components

### ShapeConverter
- **Purpose**: Normalize various input formats to 3D (batch, sequence, features)
- **Inputs**: 1D, 2D, 3D arrays or JSON strings
- **Outputs**: Validated 3D structure with metadata
- **Validation**: Size limits, numeric values, consistent dimensions

### RequestBuilder
- **Purpose**: Assemble Arrow-formatted API requests
- **Features**:
  - Model-specific parameter handling
  - Metadata schema construction
  - HTTP header generation
  - Input validation before API call

### ForecastClient
- **Purpose**: Execute forecasts with automatic retry
- **Features**:
  - Bearer token authentication
  - Exponential backoff retry
  - Timeout management
  - Error mapping
  - Response deserialization

### ArrowSerializer
- **Purpose**: Handle Apache Arrow IPC serialization
- **Features**:
  - Serialize arrays + metadata to IPC stream
  - Deserialize IPC stream back to arrays
  - Zstd compression detection (placeholder)
  - Zero-copy operations where possible

## Adding New Features

### Add a New Model Parameter
1. Edit `src/api/requestBuilder.ts` - Add to `buildMetadata()`
2. Edit `src/nodes/FAIMForecast/FAIMForecast.node.ts` - Add UI field and parameter handling
3. Add tests in `tests/unit/`

### Add Model Support
1. Add model name to `VALID_MODELS` in `requestBuilder.ts`
2. Add model-specific UI fields in node definition
3. Update `buildMetadata()` to handle new parameters
4. Add examples in `examples/`

### Improve Error Messages
1. Edit `src/errors/errorHandler.ts` - Update `getUserMessage()`
2. Add specific guidance for common issues
3. Update README troubleshooting section

## Dependencies

### Production
- **apache-arrow** (v14): Arrow IPC serialization
- **axios** (v1.6): HTTP client
- **pako** (v2.1): Optional compression support
- **zstd-wasm** (v0.3): Zstd decompression (optional)

### Development
- **typescript**: Type checking
- **jest**: Testing framework
- **ts-jest**: TypeScript + Jest integration
- **eslint**: Code quality
- **@typescript-eslint**: TS linting rules
- **n8n-core, n8n-workflow**: n8n types (peer dependencies)

## Publishing

### Version Numbering
Use semantic versioning:
- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features
- **Patch** (1.0.0 → 1.0.1): Bug fixes

### Release Process
1. Update version in `package.json`
2. Add entry to CHANGELOG (if applicable)
3. Create git tag: `git tag v1.0.0`
4. Push to main branch
5. CI/CD automatically publishes to npm (if `NPM_TOKEN` secret is set)

### npm Publish
```bash
# Manual publish (if CI/CD not available)
pnpm publish --access public
```

Requires npm account and authentication.

## Performance Considerations

### Memory
- Input size limited to 50M elements (configurable in ShapeConverter)
- Arrow serialization uses streaming where possible
- Batch processing reduces per-request overhead

### Latency
- Default timeout: 30s (including retries)
- Exponential backoff jitter prevents thundering herd
- Batch processing reduces round-trip time

### Cost
- Batch multiple requests when possible
- Use smaller horizons if not needed
- Point forecasts cheaper than quantiles/samples

## Troubleshooting Development

### Build errors
```bash
# Clear build cache
rm -rf dist/
pnpm run build
```

### Test failures
```bash
# Run specific test with verbose output
pnpm test -- tests/unit/mytest.test.ts --verbose

# Run with debugging
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Type errors
```bash
# Check types without building
pnpm exec tsc --noEmit
```

### Linting issues
```bash
# Auto-fix all fixable issues
pnpm run lint:fix
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes and add tests
4. Ensure tests pass: `pnpm run test`
5. Ensure linting passes: `pnpm run lint`
6. Commit with clear message: `git commit -m 'Add amazing feature'`
7. Push to branch and create Pull Request