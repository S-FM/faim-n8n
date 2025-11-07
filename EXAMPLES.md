# Example Workflows

This directory contains ready-to-use n8n workflows demonstrating FAIM forecast node capabilities.

## How to Use

1. In n8n, go to **Workflows** → **Import from File**
2. Select any example JSON file
3. Set up your FAIM API credentials
4. Execute the workflow

## Available Examples

### 1. Chronos2 Simple Forecast
**File**: `chronos2-simple-forecast.json`

**What it does**:
- Takes a simple 1D time series (univariate)
- Generates 10-step point forecast using Chronos2
- Displays results with metadata and cost

**Use case**: Basic forecasting of a single metric (sales, traffic, etc.)

**Data**: Daily values over 20 days
**Model**: Chronos2 (accurate, good for most use cases)
**Output**: Single point forecast for next 10 periods

---

### 2. FlowState with Custom Parameters
**File**: `flowstate-with-parameters.json`

**What it does**:
- Demonstrates multivariate forecasting (multiple features)
- Uses FlowState model with custom parameters
- Shows scale factor and prediction type (median vs mean)
- Good for flexible, balanced forecasting

**Use case**: Forecasting multiple correlated metrics together

**Data**: 3 time series with 5 samples each, 2 features per sample
**Model**: FlowState (flexible state-space model)
**Parameters**:
  - Scale factor: 1.0 (normalization)
  - Prediction type: median (robust to outliers)
**Output**: Point forecast for next 5 periods

---

### 3. Chronos2 Quantiles for Confidence Intervals
**File**: `chronos2-quantiles-confidence.json`

**What it does**:
- Generates not just point forecasts, but confidence intervals
- Extracts 5th, 25th, 50th, 75th, 95th percentiles
- Shows 90% confidence interval (5th to 95th)
- Includes median forecast (50th percentile)

**Use case**: Risk analysis, planning with uncertainty bounds

**Data**: Revenue data over 14 days
**Model**: Chronos2 (LLM-based, excellent for quantiles)
**Output**:
  - Median forecast (50th percentile)
  - 90% confidence interval (5th-95th percentile)
  - Intermediate quantiles (25th, 75th)

**Extract Confidence Intervals node**:
- Demonstrates how to process quantile outputs
- Shows Code node usage for data transformation
- Easy to integrate into downstream analysis

---

### 4. Batch Processing - Multiple Time Series
**File**: `batch-processing-multiple-series.json`

**What it does**:
- Forecasts 3 different time series in ONE API call
- More efficient than calling API 3 times separately
- Processes results and displays comparison
- Shows cost savings of batch processing

**Use case**: Forecasting multiple products, regions, or metrics efficiently

**Data**: 3 separate time series (batch size = 3)
**Model**: TiRex (transformer-based, good for batches)
**Output**: Forecasts for all 3 series simultaneously

**Performance benefit**:
- Single API call = single billing transaction
- Lower latency than 3 sequential calls
- Better resource utilization

---

## Workflow Patterns

### Pattern 1: Simple Processing
```
Data → FAIM Forecast → Display
```
Minimal setup, good for testing and exploration.

### Pattern 2: Output Transformation
```
Data → FAIM Forecast → Code (transform output) → Display/Store
```
Use Code node to extract specific parts of the forecast for downstream use.

### Pattern 3: Multiple Models Comparison
```
Data →
  ├→ Chronos2 Forecast
  ├→ FlowState Forecast
  └→ TiRex Forecast
    ↓
  Merge Results → Compare Metrics
```
Evaluate which model works best for your data.

### Pattern 4: Batch Processing
```
Multiple Series Array → FAIM Forecast (batch) → Process Results
```
Efficient processing of many time series in single request.

---

## Common Modifications

### Change Input Data
Edit the **Set** node to use your own data:
```json
{
  "myTimeSeries": [10, 12, 15, 14, 16, ...]
}
```

### Change Forecast Horizon
In FAIM Forecast node, adjust **Forecast Horizon** parameter:
- 7 for weekly
- 24 for daily (next 24 hours)
- 30 for monthly
- 365 for yearly

### Add More Models
Duplicate the FAIM Forecast node and change **Model** parameter to:
- `chronos2` (best accuracy)
- `flowstate` (balanced)
- `tirex` (fast)

### Store Results
Add a database node after forecast to save results:
```
FAIM Forecast → PostgreSQL/MongoDB → Update your system
```

---

## Troubleshooting Examples

### Error: "Invalid API key"
- Check credentials are properly set in n8n
- Verify API key format: `sk-...`
- Confirm key is active on faim.ai dashboard

### Error: "Request too large"
- Reduce batch size or sequence length
- Split into multiple smaller requests
- Example: Instead of 1000 points, use 500 + 500

### Slow Performance
- Use batch processing (combine multiple series)
- Reduce horizon if not needed
- Use TiRex instead of Chronos2 for speed

### High Costs
- Batch multiple forecasts together
- Use smaller horizons
- Use point forecast instead of quantiles

---

## Next Steps

1. **Customize for your data**: Modify example workflows with your actual time series
2. **Add automation**: Schedule workflows to run on a schedule (daily, weekly, etc.)
3. **Integrate with databases**: Store forecasts in your system
4. **Build dashboards**: Visualize forecasts using n8n's visualization nodes
5. **Monitor predictions**: Track forecast accuracy over time

---

## Support

- Full documentation: [README.md](README.md)
- API reference: [faim.ai/docs](https://faim.ai/docs)
- Issues: [GitHub](https://github.com/faim-group/n8n-nodes-faim)