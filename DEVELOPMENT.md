# Development Guide

This document covers development, testing, and contribution guidelines for the FAIM n8n node.

## Project Structure

```
faim-n8n/
├── src/
│   ├── api/                 # HTTP API client & request building
│   │   ├── forecastClient.ts  # Main client with retry logic & reshaping
│   │   └── requestBuilder.ts  # JSON request assembly & validation
│   ├── data/                # Data processing & validation
│   │   ├── shapeConverter.ts   # 1D/2D/3D normalization
│   │   ├── shapeReshaper.ts    # Output reshaping to input format
│   │   └── jsonSerializer.ts   # JSON serialization & type checks
│   ├── errors/              # Error handling
│   │   ├── customErrors.ts  # Error classes
│   │   └── errorHandler.ts  # Error mapping & messages
│   ├── nodes/               # n8n node definitions
│   │   └── FAIMForecast/
│   │       ├── FAIMForecast.node.ts
│   │       ├── FAIMForecast.credentials.ts
│   │       └── faim.png
│   └── index.ts             # Public exports
├── tests/                   # Test files
│   ├── shapeConverter.test.ts    # Data normalization tests
│   ├── shapeReshaper.test.ts     # Output reshaping tests
│   ├── requestBuilder.test.ts    # Request assembly tests
│   └── setup.ts                  # Test configuration
├── examples/                # Example n8n workflows
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
RequestBuilder (validate & prepare JSON)
    ↓
ForecastClient (HTTP + retry logic)
    ↓
API Response (JSON)
    ↓
ShapeReshaper (reshape to input format)
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
- **Purpose**: Assemble JSON API requests and validate parameters
- **Features**:
  - Model-specific parameter handling
  - Metadata schema construction
  - HTTP header generation (Authorization, Content-Type)
  - Input validation before API call
  - Request URL construction

### ForecastClient
- **Purpose**: Execute forecasts with automatic retry and output reshaping
- **Features**:
  - Bearer token authentication
  - Exponential backoff retry (2s, 4s, 8s + jitter)
  - Timeout management (default 30s)
  - Error mapping & classification
  - Response deserialization (JSON)
  - Output reshaping to original input format

### ShapeReshaper
- **Purpose**: Transform API outputs back to original input dimensions
- **Features**:
  - Reshape point forecasts to 1D/2D format
  - Reshape quantiles to 1D/2D/3D format
  - Reshape samples to 1D/2D/3D format
  - Handle univariate outputs (features=1)

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
- **None** (zero external dependencies for n8n Cloud compatibility)

### Built-in n8n Integration
- **n8n's `this.helpers.httpRequest`**: HTTP client (built-in, no dependency)

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
- JSON serialization kept minimal - no binary overhead
- Batch processing reduces per-request overhead

### Latency
- Default timeout: 30s (including retries)
- Exponential backoff jitter prevents thundering herd
- Batch processing reduces round-trip time

### Cost
- Batch multiple requests when possible
- Use smaller horizons if not needed
- Point forecasts cheaper than quantiles/samples

## n8n Cloud Compatibility

This node is designed for n8n Cloud compliance:
- **Zero external dependencies**: Uses only n8n built-in helpers
- **No restricted globals**: No `setTimeout`, `setInterval`, or `console.log`
- **JSON-only serialization**: No binary formats required
- **n8n helpers only**: Uses `this.helpers.httpRequest` for HTTP calls

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