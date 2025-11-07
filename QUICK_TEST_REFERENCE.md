# Quick Test Reference - Copy & Paste

## Fastest Way to Test (< 2 minutes)

### Step 1: Open n8n
```bash
open http://localhost:5678
```

### Step 2: Add Set Node with Test Data
```json
{
  "timeSeries": [10, 12, 14, 13, 15, 17, 16, 18, 20, 19, 21, 22]
}
```

### Step 3: Configure FAIM Node
- **Model**: chronos2
- **Model Version**: 1
- **Input Data**: `{{ $json.timeSeries }}`
- **Horizon**: 7
- **Output Type**: point

### Step 4: Execute
Click "Execute Workflow" → See forecast results ✅

---

## All Test Data Variations

### 📊 Basic 1D (Single Series)
```json
{
  "data": [10, 12, 14, 13, 15, 17, 16, 18, 20, 19, 21, 22]
}
```
**Best For**: Stock prices, temperature, demand
**Models**: chronos2, tirex
**Horizon**: 1-1000 steps

---

### 📈 2D Array (Multiple Series)
```json
{
  "data": [
    [100, 200],
    [101, 202],
    [102, 204],
    [103, 206],
    [104, 208],
    [105, 210],
    [106, 212],
    [107, 214]
  ]
}
```
**Best For**: Price + Volume, Temp + Humidity
**Models**: flowstate, chronos2
**Horizon**: 1-1000 steps

---

### 🎯 3D Array (Batch Processing)
```json
{
  "data": [
    [[10, 20], [11, 21], [12, 22], [13, 23], [14, 24]],
    [[100, 200], [101, 201], [102, 202], [103, 203], [104, 204]],
    [[1000, 2000], [1010, 2010], [1020, 2020], [1030, 2030], [1040, 2040]]
  ]
}
```
**Best For**: Multi-store forecasts, regional data
**Models**: All models (chronos2, flowstate, tirex)
**Horizon**: 1-1000 steps per batch

---

## Quick Model Comparison

| Model | Best For | Speed | Accuracy | Parameters |
|-------|----------|-------|----------|-----------|
| **Chronos2** | General purpose, fast | ⚡ Fast | 🟡 Good | quantiles, scale |
| **FlowState** | Multivariate data | 🟡 Medium | 🟢 Excellent | scale_factor, prediction_type |
| **TiRex** | Long horizons, trends | 🟠 Slow | 🟢 Excellent | None |

---

## Output Type Comparison

### Point (Default)
```json
{
  "forecast": {
    "point": [[[23], [24], [25], [26], [27], [28], [29]]]
  }
}
```
**Use When**: You need single best estimate

### Quantiles
```json
{
  "forecast": {
    "quantiles": [[[20, 23, 26], [21, 24, 27]]]
  }
}
```
**Use When**: You need confidence intervals (lower, median, upper)

### Samples
```json
{
  "forecast": {
    "samples": [[[23, 24, 25], [24, 25, 26]]]
  }
}
```
**Use When**: You need probability distribution samples

---

## Real-World Test Cases

### 💰 Stock Price (20 days → 10 day forecast)
```json
{
  "price": [150.25, 151.30, 150.80, 152.15, 153.40, 152.90, 154.20, 155.10, 154.75, 156.30, 157.20, 156.85, 158.40, 159.10, 158.90, 160.25, 161.30, 160.80, 162.50, 163.75]
}
```
**Settings**:
```
Model: chronos2
Horizon: 10
Output: point
```

### 🌡️ Weather Data (15 days → 7 day forecast)
```json
{
  "weather": [
    [72.5, 45],
    [73.0, 46],
    [72.8, 47],
    [74.2, 48],
    [75.5, 47],
    [76.0, 46],
    [75.8, 45],
    [74.5, 44],
    [73.2, 45],
    [72.0, 46],
    [71.5, 47],
    [70.8, 48],
    [72.0, 49],
    [73.5, 48],
    [75.0, 46]
  ]
}
```
**Settings**:
```
Model: flowstate
Horizon: 7
Output: point
```

### 📦 Sales Forecast (8 quarters → 4 quarter forecast)
```json
{
  "sales": [
    [1000, 2500],
    [1100, 2600],
    [1050, 2550],
    [1200, 2700],
    [1150, 2680],
    [1250, 2800],
    [1300, 2850],
    [1280, 2820]
  ]
}
```
**Settings**:
```
Model: chronos2
Horizon: 4
Output: quantiles
```

---

## Error Testing

### Test Validation (Should Fail)
```json
{
  "empty": [],
  "nulls": [1, null, 3],
  "mixed": [1, "text", 3],
  "inconsistent": [[1, 2], [3, 4, 5]]
}
```

### Test Bounds (Should Fail)
```
Model: chronos2
Horizon: 0          // ❌ Min is 1
Horizon: 1001       // ❌ Max is 1000
Model: invalid      // ❌ Use chronos2/flowstate/tirex
```

---

## Node Configuration Cheat Sheet

```
┌─────────────────────────────────────┐
│       FAIM FORECAST NODE            │
├─────────────────────────────────────┤
│ Model           │ chronos2 ▼        │
│ Model Version   │ 1                 │
│ Input Data      │ {{ $json.data }}  │
│ Horizon         │ 7                 │
│ Output Type     │ point ▼           │
└─────────────────────────────────────┘
```

**Required Fields**: All of the above
**Auto-converts**: 1D, 2D, 3D arrays automatically
**Validates**: Numeric only, no nulls, consistent dimensions

---

## Expected Outputs

### Success Response
```json
{
  "forecast": {...},
  "metadata": {
    "modelName": "chronos2",
    "modelVersion": "1",
    "inputShape": {"batch": 1, "sequence": 12, "features": 1},
    "outputShape": {"batch": 1, "horizon": 7, "features": 1}
  },
  "executionStats": {
    "durationMs": 1234,
    "retryCount": 0,
    "batchSize": 1
  }
}
```

### Error Response
```json
{
  "error": "ValidationError",
  "message": "horizon must be between 1 and 1000",
  "field": "horizon",
  "code": "VALIDATION_ERROR"
}
```

---

## Pro Tips

✅ **DO:**
- Use realistic data ranges (don't use 0s and 1000s in same series)
- Keep horizon under 200 for faster results
- Use batch mode (3D) for multiple independent forecasts
- Test with at least 5-10 historical points

❌ **DON'T:**
- Use empty arrays
- Mix data types (numbers + strings)
- Use NaN or Infinity values
- Set horizon > 1000
- Use models that don't exist

---

## File Reference

📄 **TEST_DATA_EXAMPLES.md** - Full detailed examples (this file)
📄 **test-data.json** - Machine-readable test cases
📄 **test-workflow.json** - Ready-to-import workflow
📄 **test-locally.ts** - Local testing without API

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "horizon must be between 1 and 1000" | Check horizon value, use 1-1000 |
| "All elements must be numeric" | Check for null/undefined/strings in data |
| "Model not found" | Use: chronos2, flowstate, or tirex |
| "API key is required" | Create credentials in n8n |
| Node not appearing | Restart n8n: `pkill -f "n8n" && n8n start` |

---

## Quick Commands

```bash
# Test locally (no API needed)
npx ts-node test-locally.ts

# Run all tests
pnpm run test

# Rebuild project
pnpm run build

# Check types
pnpm run type-check

# Start n8n
n8n start

# Stop n8n
pkill -f "n8n"
```

---

**Ready to test? Copy data, paste in Set node, configure FAIM node, execute! 🚀**