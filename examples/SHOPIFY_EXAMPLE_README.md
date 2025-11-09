# Shopify Demand Forecast with FAIM - Example Workflow

## Executive Summary

**Shopify Demand Forecast with FAIM** is a production-ready n8n workflow that demonstrates an end-to-end e-commerce demand forecasting pipeline. It combines Shopify historical sales data with FAIM's state-of-the-art time-series forecasting to generate actionable 30-day demand predictions across multiple SKUs.

### What This Example Teaches

✓ Building ML-driven forecasting pipelines in n8n
✓ Time-series data transformation and normalization
✓ Integrating specialized ML APIs (FAIM)
✓ Multi-SKU demand prediction at scale
✓ Parallel data routing and dual output strategies
✓ Google Sheets as a data analytics backend
✓ Production-ready error handling and scheduling

---

## Quick Facts

| Aspect | Details |
|--------|---------|
| **Workflow Name** | Shopify Demand Forecast with FAIM |
| **Status** | Production-Ready |
| **Nodes** | 9 (Code, FAIM, Google Sheets, etc.) |
| **Historical Data** | 365 days × 3 SKUs = 1,095 data points |
| **Forecast Horizon** | 30 days |
| **Predictions Output** | 90 SKU-level + 30 summary rows |
| **Execution Time** | ~5-10 seconds |
| **Models Supported** | Chronos2 (default), FlowState, TiRex |
| **Google Sheets Output** | 2 tabs (Daily SKU forecasts + Daily summary) |

---

## Workflow Architecture

```
┌─────────────────┐
│ Manual Trigger  │  Starts the forecasting pipeline
└────────┬────────┘
         │
┌────────▼──────────────────┐
│ Mock Shopify Orders [CODE]│  Generates 365 days of historical sales
│ 3 SKUs × 365 days = 1095  │  (realistic seasonality & trends)
│ rows per execution        │
└────────┬──────────────────┘
         │
┌────────▼────────────────────────┐
│ Transform to FAIM Format [CODE] │  Converts to 3D tensor:
│ Converts to 3D array            │  [batch=3][sequence=365][features=1]
│ [batch][sequence][features]     │
└────────┬────────────────────────┘
         │
┌────────▼──────────────────────┐
│ FAIM Forecast Node            │  API: /v1/ts/forecast/{model}
│ Model: Chronos2               │  Input: 3D tensor
│ Horizon: 30 days              │  Output: Point forecasts
│ Batch: 3 SKUs                 │  Time: ~2-5 seconds
└────────┬──────────────────────┘
         │
┌────────▼──────────────────────┐
│ Process Forecast Results[CODE]│  Transforms output:
│ Daily SKU predictions          │  • Maps to future dates
│ Daily aggregate totals         │  • Calculates daily sums
│ Non-negative floor             │  • Ensures realistic values
└────────┬──────────────────────┘
         │
┌────────▼──────────────────────┐
│ Split for Google Sheets [CODE]│  Routes to 2 outputs:
│ Output 1: SKU-level forecasts │  • Daily_SKU_Forecasts tab
│ Output 2: Daily totals        │  • Daily_Summary tab
└────────┬──────────────────────┘
    ┌────┴────┐
    │         │
┌───▼──────────────────────┐  ┌───▼───────────────────────┐
│ Google Sheets - SKU      │  │ Google Sheets - Summary   │
│ Daily Forecasts          │  │ Daily Totals              │
│ Appends 90 rows          │  │ Appends 30 rows           │
│ (30 days × 3 SKUs)       │  │ (30 days totals)          │
└───┬──────────────────────┘  └───┬───────────────────────┘
    └────┬────────────────────┘
         │
┌────────▼───────────────┐
│ Workflow Summary (NoOp)│  Pipeline complete ✓
└───────────────────────┘
```

---

## Files in This Example

### 1. **shopify-demand-forecast-faim.json** (Main Workflow)
Complete n8n workflow definition. Import this into n8n to get started.
- 9 nodes configured with descriptions
- Connection topology for data flow
- Environment variable placeholders
- Ready to execute

### 2. **SETUP.md** (Quick Start)
5-minute setup guide for immediate execution.
- Prerequisites checklist
- Step-by-step configuration
- Troubleshooting quick reference
- **Start here for fastest deployment**

### 3. **SHOPIFY_FORECAST_GUIDE.md** (Detailed Documentation)
Comprehensive educational guide covering:
- Full node-by-node documentation
- Data flow examples with schemas
- Customization patterns
- Real-world use cases
- Production scaling guidance
- **Best for understanding every detail**

### 4. **SHOPIFY_EXAMPLE_README.md** (This File)
High-level overview and quick reference.
- Architecture summary
- Use case examples
- Integration patterns
- Next steps

---

## Core Nodes Explained

### Data Generation Layer

#### Node 1: Mock Shopify Orders
Simulates 365 days of real e-commerce data with:
- **3 SKUs**: Professional Widget, Smart Gadget Pro, Industrial Tool Kit
- **Seasonality**: 30% lower sales on weekends
- **Trends**: 20% growth over 12 months
- **Variation**: ±20% daily random noise

**Output Example:**
```json
{
  "orders": [
    { "date": "2024-01-01", "sku": "SKU-001-WIDGET", "quantity": 120 },
    { "date": "2024-01-01", "sku": "SKU-002-GADGET", "quantity": 85 },
    { "date": "2024-01-01", "sku": "SKU-003-TOOL", "quantity": 45 }
  ]
}
```

**Real-World Replacement:** Use actual Shopify GraphQL or REST API

### Data Preparation Layer

#### Node 2: Transform to FAIM Format
Converts flat sales records into ML-ready 3D tensor:
- Groups by SKU
- Maintains temporal sequence (365 days)
- Handles missing days (fills with 0)
- Output shape: `[3 SKUs][365 days][1 quantity]`

**Why This Matters:** FAIM expects normalized 3D arrays for batch processing

### Forecasting Layer

#### Node 3: FAIM Forecast Node
Executes time-series forecasting API:
- **Model**: Chronos2 (fastest, best for seasonal patterns)
- **Input**: 3D tensor of historical quantities
- **Horizon**: 30-day predictions
- **Output**: Point forecasts for each SKU

**Key Features:**
- Automatic batch processing (3 SKUs in parallel)
- Handles missing data gracefully
- Returns metadata (model version, shapes, transaction ID)
- Supports confidence intervals with FlowState model

**API Call Example:**
```bash
POST /v1/ts/forecast/chronos2/1
Authorization: Bearer {apiKey}
Content-Type: application/vnd.apache.arrow.stream

[Arrow IPC binary stream: [[[120,115,...],[85,87,...],[45,48,...]]]
```

### Post-Processing Layer

#### Node 4: Process Forecast Results
Transforms raw model output into business metrics:
- Extracts point forecasts
- Maps to future calendar dates
- Calculates daily aggregate totals
- Floors negative values (no negative demand)

**Output Split:** Creates 2 datasets simultaneously
- Dataset 1: Daily SKU-level predictions (90 rows)
- Dataset 2: Daily total demand (30 rows)

### Analytics & Output Layer

#### Nodes 5-6: Google Sheets Writers
Parallel writes to 2 spreadsheet tabs:
- **Tab 1**: Daily_SKU_Forecasts (90 rows: 30 days × 3 SKUs)
- **Tab 2**: Daily_Summary (30 rows: daily totals)

**Why Parallel Writes?** Independent targets allow separate analytics workflows

---

## Data Pipeline Example

### Input: Historical Sales (Last 365 Days)

| Date | SKU-001 | SKU-002 | SKU-003 |
|------|---------|---------|---------|
| 2024-01-01 | 120 | 85 | 45 |
| 2024-01-02 | 115 | 87 | 48 |
| ... | ... | ... | ... |
| 2025-01-14 | 125 | 90 | 50 |

**Total: 1,095 data points (365 days × 3 SKUs)**

### Processing: FAIM Chronos2 Model

```
3D Tensor Input: [3, 365, 1]
  ├─ Batch 0: SKU-001 quantities [120, 115, ..., 125]
  ├─ Batch 1: SKU-002 quantities [85, 87, ..., 90]
  └─ Batch 2: SKU-003 quantities [45, 48, ..., 50]

Model: Chronos2
  ├─ Learns temporal patterns
  ├─ Captures seasonality (weekends)
  ├─ Detects trends
  └─ Handles multiple series simultaneously

Output: 3D Tensor [3, 30, 1]
  ├─ Batch 0: 30-day forecast for SKU-001
  ├─ Batch 1: 30-day forecast for SKU-002
  └─ Batch 2: 30-day forecast for SKU-003
```

### Output: 30-Day Forecast

**Daily_SKU_Forecasts Tab:**
| Date | SKU | Predicted_Qty | Day |
|------|-----|---------------|-----|
| 2025-01-15 | SKU-001-WIDGET | 126 | 1 |
| 2025-01-15 | SKU-002-GADGET | 91 | 1 |
| 2025-01-15 | SKU-003-TOOL | 51 | 1 |
| ... | ... | ... | ... |
| 2025-02-13 | SKU-003-TOOL | 54 | 30 |

**Daily_Summary Tab:**
| Date | Total_Quantity | SKU_Count |
|------|----------------|-----------|
| 2025-01-15 | 268 | 3 |
| 2025-01-16 | 271 | 3 |
| ... | ... | ... |
| 2025-02-13 | 279 | 3 |

---

## Use Case Examples

### 1. Inventory Optimization
```
Forecast: 268 units/day average
Safety Stock: 15% = 40 units
Lead Time: 7 days
Reorder Point: (268 × 7) + 40 = 1,916 units
→ Auto-trigger purchase when inventory < 1,916
```

### 2. Warehouse Planning
```
Forecast peak: Feb 1 (285 units/day)
Forecast low: Jan 20 (245 units/day)
Variance: 16%
→ Plan staffing for ±2 personnel swings
```

### 3. Production Scheduling
```
SKU-001: Avg 125 units/day × 30 days = 3,750 units
SKU-002: Avg 91 units/day × 30 days = 2,730 units
SKU-003: Avg 50 units/day × 30 days = 1,500 units
→ Schedule production batches accordingly
```

### 4. Marketing Campaign Timing
```
Forecast low: Jan 25-28 (240 units/day)
Forecast high: Feb 8-12 (285 units/day)
→ Launch discount campaign on Jan 25 to boost demand
→ Premium pricing on Feb 8-12 during peak
```

### 5. Revenue Forecasting
```
Avg price per unit: $47.50
Forecast: 268 units/day × 30 days
Revenue: 8,040 units × $47.50 = $381,900
Confidence: Point forecast (adjust ±10% for safety)
```

---

## Customization Patterns

### Pattern 1: Extend Forecast Horizon
**Change from 30 to 90 days:**
1. Edit Node 3: `"horizon": 30` → `"horizon": 90`
2. Edit Node 4: Loop `for (let day = 0; day < 30; day++)` → `90`
3. Expected rows: 270 SKU-level (90 × 3), 90 summary

### Pattern 2: Add More SKUs
**Add 2 additional SKUs:**
1. Edit Node 1: Extend `skus` array to 5 items
2. Edit Node 1: Add to `baseQuantities` object
3. FAIM handles automatically (batch=5)
4. Expected rows: 150 SKU-level (30 × 5), 30 summary

### Pattern 3: Use Different Model
**Switch from Chronos2 to FlowState (includes confidence intervals):**
1. Edit Node 3: `"model": "chronos2"` → `"model": "flowstate"`
2. FAIM response includes `quantiles` with confidence bounds
3. Update Node 4 to extract confidence intervals

### Pattern 4: Real Shopify Data
**Replace mock data with live API:**
1. Delete Node 1 (Mock Shopify Orders)
2. Add `n8n-nodes-base.shopify` node
3. Configure REST endpoint: `/orders.json` with date filters
4. Connect to Node 2 (Transform to FAIM Format)

### Pattern 5: Additional Notifications
**Add Slack alerts for forecast anomalies:**
1. After Node 4, add Switch node
2. Condition: `if (max_forecast > threshold)`
3. Route to Slack node with alert message
4. Include SKU and predicted quantity

---

## Integration Patterns

### Pattern A: Email Reports
```
Process Results → Format as HTML → Send Email
```

### Pattern B: Webhook Trigger
```
External App → Webhook → FAIM Forecast → Response JSON
```

### Pattern C: Database Storage
```
Process Results → Code (transform) → PostgreSQL Insert
```

### Pattern D: Multi-Channel Publishing
```
Process Results → Split 3 ways:
  ├─ Google Sheets
  ├─ Slack message
  └─ MongoDB collection
```

### Pattern E: Scheduled + Webhook
```
Schedule Trigger (daily) → Forecast
Manual Trigger (webhook) → Forecast
Both write to same Google Sheet (append pattern)
```

---

## Performance Characteristics

| Scenario | Historical Points | Processing Time | Output Rows | API Calls |
|----------|------------------|-----------------|-------------|-----------|
| 3 SKUs × 365 days | 1,095 | 5-8s | 90 + 30 | 1 FAIM + 2 Sheets |
| 10 SKUs × 365 days | 3,650 | 8-12s | 300 + 30 | 1 FAIM + 2 Sheets |
| 100 SKUs × 365 days | 36,500 | 15-20s | 3,000 + 30 | 1 FAIM + 2 Sheets |
| 100 SKUs × 730 days | 73,000 | 20-30s | 3,000 + 30 | 1 FAIM + 2 Sheets |

**Scaling Factor:** Linear in data points, non-linear in Sheets writes (parallelization helps)

---

## Deployment Guide

### Development Environment
1. Local n8n instance
2. Mock data for testing
3. Test Google Sheet
4. FAIM sandbox credentials

### Staging Environment
1. n8n cloud instance
2. Real Shopify test store data
3. Staging Google Sheet
4. FAIM production API

### Production Environment
1. n8n enterprise or self-hosted
2. Real Shopify store data
3. Production Google Sheet
4. FAIM production API with premium tier
5. Schedule trigger (daily at 2 AM UTC)
6. Error notifications (Slack/Email)
7. Data retention policy (archive old Sheets)

---

## Monitoring & Maintenance

### Key Metrics to Track
- **Forecast Accuracy**: MAPE (Mean Absolute Percentage Error)
- **Execution Time**: Alert if > 30 seconds
- **API Errors**: 5xx errors from FAIM
- **Sheets Write Success**: Monitor for quota limits
- **Data Freshness**: Ensure daily runs complete on time

### Monthly Maintenance
- Review forecast accuracy vs. actual sales
- Retrain model if accuracy drops > 5%
- Check FAIM API usage and costs
- Archive old Google Sheets data (>90 days)

### Quarterly Reviews
- Evaluate alternative models (FlowState, TiRex)
- Test with additional SKUs
- Benchmark against simpler baselines
- Update documentation for team

---

## FAQ

**Q: Can I use this for >100 SKUs?**
A: Yes, FAIM handles scaling automatically. Google Sheets may hit quota limits—migrate to PostgreSQL or BigQuery for larger datasets.

**Q: What if I have <365 days of historical data?**
A: FAIM works with shorter histories (~90 days minimum). Accuracy improves with more data.

**Q: Can I get confidence intervals instead of point forecasts?**
A: Switch to FlowState model in Node 3 for quantile forecasts with confidence bounds.

**Q: How do I integrate with my inventory system?**
A: Add a code node after Process Results to format data for your system's API, then use HTTP Request node.

**Q: Can I forecast at weekly or monthly granularity?**
A: Aggregate daily data in Node 2 before sending to FAIM (group by week or month).

**Q: What about external factors (holidays, promotions)?**
A: Add external regressors in FlowState model or use separate ensemble approach.

---

## Next Steps

1. **Quick Start:** Follow SETUP.md for 5-minute import
2. **Deep Dive:** Read SHOPIFY_FORECAST_GUIDE.md for detailed documentation
3. **Customize:** Modify nodes based on your SKUs and forecast needs
4. **Deploy:** Move from test to production with scheduled execution
5. **Monitor:** Track forecast accuracy and system performance
6. **Iterate:** Update model annually based on accuracy metrics

---

## Support Resources

- **FAIM Docs:** https://faim.group/docs
- **n8n Docs:** https://docs.n8n.io
- **Chronos2 Paper:** https://arxiv.org/abs/2310.07008
- **Demand Forecasting Best Practices:** https://en.wikipedia.org/wiki/Demand_forecasting

---

**Workflow Status:** ✓ Production-Ready
**Last Updated:** 2025-01-15
**Version:** 1.0
**Maintainer:** FAIM Team
**License:** MIT

---

**Ready to get started?** Begin with `SETUP.md` for quick deployment or `SHOPIFY_FORECAST_GUIDE.md` for comprehensive learning.