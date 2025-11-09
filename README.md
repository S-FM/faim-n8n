# FAIM n8n Node

Generate high-quality time-series forecasts using **FAIM** (Foundation AI Models) in n8n workflows.

Uses the state-of-the-art **Chronos 2.0** foundation time-series model for accurate forecasting.

## Installation

Install directly in n8n:

```bash
npm install @faim-group/n8n-nodes-faim
```

Or use n8n's community node installer UI.

## Quick Start

### 1. Get an API Key

Sign up at [faim.it.com](https://faim.it.com) to get your API key.

### 2. Add Credentials in n8n

1. Open n8n and go to **Credentials**
2. Create new credential of type **FAIM API Key**
3. Paste your API key (format: `api_key_1-...`)

### 3. Use the Node

1. Add a **FAIM Forecast** node to your workflow
2. Select credentials
3. Configure parameters (horizon, output type, quantiles)
4. Connect time-series data

## Input Format

The node accepts **univariate time-series data only** (single feature per timestamp). Data can be provided in two formats:

### 1D Array (Single Time Series)
```json
[10, 11, 12, 13, 14, 15]
```
Single series with 6 timesteps. Returns 1D output: `[forecast1, forecast2, ...]`

### 2D Array (Multiple Independent Series - Batch)
```json
[
  [10, 11, 12, 13, 14, 15],
  [20, 21, 22, 23, 24, 25],
  [100, 101, 102, 103, 104, 105]
]
```
Batch of 3 independent univariate series, each with 6 timesteps. Returns 2D output: `[[forecast1...], [forecast2...], [forecast3...]]`

**Note**: Each series is univariate (single feature per timestamp). Multivariate inputs with multiple features per timestamp are not currently supported.

## Node Parameters

### Required Parameters

- **Input Data** - Time-series data as JSON array or n8n expression
- **Forecast Horizon** - Number of future steps to forecast (1-1000)

### Optional Parameters

- **Output Type** - `point` (default) or `quantiles`
- **Quantiles** - JSON array of quantile levels (for quantiles output)
  ```json
  [0.1, 0.5, 0.9]  // 10th, 50th (median), 90th percentile
  ```

### Configuration Example

```
Input Data: {{ $json.timeSeries }}
Horizon: 24
Output Type: Quantiles
Quantiles: [0.1, 0.5, 0.9]
```

## Output Format

All models return a structured forecast response:

```json
{
  "forecast": {
    "point": [[[1.23], [1.24], ...]],
    "quantiles": null,
    "samples": null
  },
  "metadata": {
    "modelName": "chronos2",
    "modelVersion": "1",
    "transactionId": "txn_abc123",
    "costAmount": "0.005",
    "costCurrency": "USD",
    "inputShape": {
      "batch": 1,
      "sequence": 100,
      "features": 1
    },
    "outputShape": {
      "batch": 1,
      "horizon": 24,
      "features": 1
    }
  },
  "executionStats": {
    "durationMs": 2345,
    "retryCount": 0,
    "batchSize": 1
  }
}
```

Access in downstream nodes:
- Point forecast: `$json.forecast.point`
- Cost info: `$json.metadata.costAmount`
- Input shape: `$json.metadata.inputShape`

## Advanced Configuration

Configure via **Advanced Options** tab:

| Option | Default | Description |
|--------|---------|-------------|
| **Base URL** | (production) | Custom API endpoint |
| **Request Timeout** | 30000 ms | Max request duration |
| **Max Retries** | 3 | Auto-retry on transient errors |

## Error Handling

The node provides clear error messages for common issues:

| Error | Cause | Solution |
|-------|-------|----------|
| **Invalid API key** | Wrong or expired key | Check credentials in n8n |
| **Request too large** | Payload > 100MB | Reduce batch size or sequence length |
| **Insufficient funds** | Low account balance | Add credit at faim.it.com |
| **Model not found** | Invalid model/version | Check model name spelling |
| **Timeout** | Request too slow | Reduce input size and retry |
| **Invalid input** | Wrong data format | Ensure data is numeric array |

## Workflow Examples

### Example 1: Simple Forecast

```
Data → FAIM Forecast → Table visualization
```

Input: Daily sales data (1D array)
Output: 30-day forecast with point predictions

### Example 2: Quantile Intervals

```
Data → FAIM Forecast (Chronos2, quantiles) → Set (extract quantiles) → Visualization
```

Input: Time series
Output: Confidence intervals (10th, 50th, 90th percentile)


### Example 4: Batch Processing

```
Multiple series → FAIM Forecast → Extract results → Store
```

Forecast multiple time-series in single batch request (more efficient).

## API Reference

### Node Parameters

**Required:**
- `inputData`: Time-series data array
- `horizon`: Forecast steps (1-1000)

**Optional:**
- `outputType`: `point` (default) | `quantiles`
- `quantiles`: Quantile levels for quantiles output (e.g., [0.1, 0.5, 0.9])

### Client Configuration

```typescript
import { ForecastClient } from '@faim-group/n8n-nodes-faim';

const client = new ForecastClient({
  apiKey: 'sk-...',
  baseUrl: 'https://api.faim.it.com',
  timeoutMs: 30000,
  maxRetries: 3,
});

const response = await client.forecast(
  'chronos2',
  '1',
  [[1, 2, 3, 4, 5]],
  24,
  'point'
);
```

## Troubleshooting

### "Invalid data format"
- Ensure input is a JSON array of numbers
- Use 1D or 2D format only (1D: `[v1, v2, ...]` or 2D: `[[v1, v2], [v3, v4], ...]`)
- Do NOT use 3D arrays or multivariate inputs (multiple features per timestamp)
- Arrays must be rectangular (consistent dimensions)
- No null or undefined values allowed

### "Multivariate input detected"
- This error means you provided multiple features per timestamp (e.g., `[[10, 20], [11, 21]]`)
- The node only supports univariate data (single feature per timestamp)
- Use format: `[10, 11, 12]` or `[[10], [11], [12]]` for single feature per timestamp

### "Timeout errors"
- Reduce batch size (split into smaller requests)
- Reduce sequence length if possible
- Increase timeout in Advanced Options

### "Server error - out of memory"
- This is a retryable error - the node will automatically retry
- Reduce batch size to lower memory usage

### "Cost seems high"
- Larger inputs = higher cost (batch size × sequence length × horizon)
- Quantile/sample outputs cost more than point forecasts
- Use batch processing for multiple series (one transaction vs. multiple)

## Performance Tips

1. **Batch Processing**: Send multiple time-series together when possible
   - More efficient (single API call)
   - Lower total cost

2. **Smaller Horizons**: Longer forecasts are more expensive
   - Use 24-48 steps instead of 365 if possible

3. **Output Type**: Point forecasts are cheaper than quantiles
   - Use `point` output type for basic forecasts
   - Use `quantiles` when you need confidence intervals

4. **Caching**: Store results for repeated queries
   - Avoid re-forecasting same data

## Security

- API keys stored securely in n8n credentials vault
- All API communication uses HTTPS
- Keys are never logged or exposed in error messages
- SSL certificate validation enabled

## Support

- Documentation: [faim.it.com/api-docs](https://faim.it.com/api-docs)
- Email: support@faim.it.com

## License

MIT

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

**Made with ❤️ by the FAIM team**