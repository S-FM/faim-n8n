# Quick Start Guide

Get your first FAIM forecast in 5 minutes.

## 1. Get API Key

Sign up at [faim.it.com](https://faim.it.com) and get your API key (format: `sk-...`)

## 2. Install Package

In n8n:

```bash
npm install @faim-group/n8n-nodes-faim
```

Or use the n8n UI: **Settings** → **Community Nodes** → Search "faim"

## 3. Add Credentials

1. Go to **Credentials** in n8n
2. Click **+ Create New** → **FAIM API Key**
3. Paste your API key
4. Save

## 4. Create Workflow

1. Add a **Set** node (set your time-series data)
2. Add a **FAIM Forecast** node
3. Select your FAIM credentials
4. Choose model and horizon
5. Connect nodes
6. Execute

## 5. View Results

Output available as `$json`:

```javascript
$json.forecast.point        // Your forecast
$json.metadata.costAmount   // What it cost
$json.executionStats        // Performance stats
```

## Full Example Workflow

### Simplest Case (Copy & Paste)

```
[Set Node - Raw Data] → [FAIM Forecast] → [Display Results]
```

**Set Node** (enter as JSON):
```json
{
  "timeSeries": [10, 12, 14, 13, 15, 17, 16, 18, 20, 19]
}
```

**FAIM Forecast Node**:
- Model: `chronos2`
- Input Data: `{{ $json.timeSeries }}`
- Horizon: `7`
- Output Type: `point`

**Display Results** (HTML Node):
```html
<h3>Forecast Results</h3>
<pre>{{ JSON.stringify($json.forecast.point) }}</pre>
<p>Cost: {{ $json.metadata.costAmount }} {{ $json.metadata.costCurrency }}</p>
```

Execute → See your forecast!

---

## Input Formats

Pick the format that matches your data:

### Format A: 1D Array
```json
[10, 11, 12, 13, 14]
```
Use for: Single metric, simple time series

### Format B: 2D Array (One metric across time)
```json
[
  [10, 11],
  [12, 13],
  [14, 15]
]
```
Use for: Multiple features/metrics together

### Format C: 2D Array (Multiple batches)
```json
[
  [[10], [11], [12]],
  [[20], [21], [22]],
  [[30], [31], [32]]
]
```
Use for: Multiple time series at once (batch processing)

**Pro tip**: Batch processing (Format C) processes multiple series in ONE call = lower cost!

---

## Model Information

### Currently Supported Model

| Model | Best For | Accuracy |
|-------|----------|----------|
| **Chronos2** | All use cases - point, quantile & sample forecasts | Excellent |

Chronos 2.0 is a state-of-the-art large language model for time-series forecasting. It provides:
- ✅ High-quality point forecasts
- ✅ Quantile forecasts for confidence intervals (e.g., 10th/90th percentiles)
- ✅ Samples for uncertainty quantification
- ✅ Consistent accuracy across different time-series types

---

## Common Recipes

### Recipe 1: Daily Sales Forecast
```
Set Node: [5000, 5200, 5100, 5300, 5400]
Horizon: 7
Model: Chronos2
Output: Point forecast
```

### Recipe 2: Confidence Intervals
```
Set Node: [100, 102, 101, 103, 105]
Horizon: 14
Model: Chronos2
Output: Quantiles
Quantiles: [0.1, 0.5, 0.9]
```
Result: Lower bound, median, upper bound

### Recipe 3: Multiple Products (Batch)
```
Set Node:
[
  [[100, 200], [101, 202], [102, 201]],  // Product A
  [[50, 100], [51, 102], [52, 101]]      // Product B
]
Horizon: 5
Model: Chronos2
Output: Point
```
One API call, two forecasts!

### Recipe 4: Store Results
```
FAIM Forecast → PostgreSQL Insert → Confirmation
```
Automatically store forecasts in your database

---

## API Reference (Quick)

### Node Parameters

| Parameter | Required | Default | Values |
|-----------|----------|---------|--------|
| Model | ✓ | - | chronos2 |
| Input Data | ✓ | - | Array (1D, 2D, or 3D) |
| Horizon | ✓ | - | 1-1000 |
| Output Type | - | point | point, quantiles, samples |
| Quantiles | - | - | Array of numbers between 0-1 (for quantiles output type) |
| Model Version | - | "1" | String |

### Response Structure

```json
{
  "forecast": {
    "point": [[[1.5], [1.6], ...]],
    "quantiles": null,
    "samples": null
  },
  "metadata": {
    "modelName": "chronos2",
    "modelVersion": "1",
    "costAmount": "0.005",
    "costCurrency": "USD",
    "inputShape": { "batch": 1, "sequence": 10, "features": 1 },
    "outputShape": { "batch": 1, "horizon": 7, "features": 1 }
  },
  "executionStats": {
    "durationMs": 2345,
    "retryCount": 0,
    "batchSize": 1
  }
}
```

Access specific parts:
```javascript
$json.forecast.point[0]      // First forecast
$json.metadata.costAmount    // Cost
$json.executionStats.durationMs  // How long it took
```

---

## Error Messages & Fixes

| Error | Fix |
|-------|-----|
| "Invalid API key" | Check credentials in n8n |
| "Request too large" | Reduce data size or batch |
| "Timeout" | Reduce input size, increase timeout in Advanced Options |
| "Model not found" | Check model name spelling |
| "Invalid input" | Ensure data is numeric (no strings/nulls) |

---

## Tips & Tricks

### 💡 Tip 1: Batch Processing
```
// Instead of this (3 calls):
Data1 → Forecast → Store
Data2 → Forecast → Store
Data3 → Forecast → Store

// Do this (1 call):
[Data1, Data2, Data3] → Forecast (batch) → Store all
```
**Saves**: 66% on API calls!

### 💡 Tip 2: Default Parameters
Use same settings? Create a workflow template:

1. Save workflow with your preferred settings
2. Duplicate for new forecasts
3. Only change input data

### 💡 Tip 3: Schedule Forecasts
Use n8n's **Trigger** nodes:
- **Cron**: Daily/weekly forecasts
- **Webhook**: On-demand via API
- **Database**: Auto-forecast new data

### 💡 Tip 4: Monitor Costs
Check metadata to track spending:
```javascript
$json.metadata.costAmount  // Per forecast
// Sum across all forecasts for daily cost
```

---

## Next Steps

1. **Explore examples**: See [EXAMPLES.md](EXAMPLES.md) for full workflows
2. **Read full docs**: See [README.md](README.md) for complete reference
3. **Join community**: Get help at [GitHub Issues](https://github.com/faim-group/n8n-nodes-faim)
4. **Build more**: Create custom workflows for your use cases

---

## Support

- **Docs**: https://faim.it.com/docs
- **Issues**: https://github.com/faim-group/n8n-nodes-faim/issues
- **Email**: support@faim.it.com

Happy forecasting! 🚀