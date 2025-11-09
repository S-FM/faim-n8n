# Shopify Demand Forecast with FAIM - Workflow Guide

## Overview

This workflow demonstrates a **production-ready e-commerce forecasting pipeline** that:
- Fetches 365 days of historical Shopify sales data (3 SKUs)
- Generates 30-day demand forecasts using FAIM's **Chronos2** model
- Writes daily predictions and summary totals to Google Sheets
- Serves as an educational example for implementing demand forecasting in n8n

**Workflow Status:** Ready to import and customize
**Data:** Mock realistic e-commerce data (simulated)
**Model:** Chronos2 (Time-Series Forecasting)
**Horizon:** 30-day predictions
**Output:** 2 Google Sheets tabs (SKU-level + daily summary)

---

## Architecture

```
Manual Trigger
    ↓
Mock Shopify Orders [Code]
    ↓
Transform to FAIM Format [Code]
    ↓
FAIM Forecast Node [@faim-group/n8n-nodes-faim]
    ↓
Process Forecast Results [Code]
    ↓
Split for Google Sheets [Code]
    ↙               ↘
Google Sheets      Google Sheets
Daily SKU          Daily Summary
Forecasts          Totals
```

---

## Node Descriptions

### 1. **Manual Trigger**
- **Type:** n8n-nodes-base.manualTrigger
- **Purpose:** Start the forecast pipeline manually
- **Note:** In production, replace with `Schedule Trigger` (cron: `0 2 * * *` for daily 2 AM runs)
- **Description:** Initiates the entire workflow for on-demand forecasting

### 2. **Mock Shopify Orders**
- **Type:** n8n-nodes-base.code (JavaScript)
- **Purpose:** Generate 365 days of realistic historical sales data
- **Data Generated:**
  - 3 SKUs: Professional Widget, Smart Gadget Pro, Industrial Tool Kit
  - Daily quantities with realistic patterns:
    - Weekend seasonality (30% lower sales on weekends)
    - Monthly growth trend
    - Random daily variation (±20%)
- **Output Schema:**
  ```json
  {
    "orders": [
      {
        "date": "2024-01-15",
        "sku": "SKU-001-WIDGET",
        "quantity": 95,
        "sales_amount": 5250.75,
        "product_name": "Professional Widget"
      }
    ],
    "total_days": 365,
    "sku_count": 3
  }
  ```
- **Real-World Usage:** Replace with actual Shopify node using REST API or GraphQL

### 3. **Transform to FAIM Format**
- **Type:** n8n-nodes-base.code (JavaScript)
- **Purpose:** Convert Shopify data into FAIM's expected input format
- **Transformation:**
  - Groups orders by SKU
  - Creates time-series sequences (365 days per SKU)
  - Formats as 3D array: `[batch=3 SKUs][sequence=365 days][features=1 quantity]`
- **Output Schema:**
  ```json
  {
    "time_series": [[[120], [115], ...], [[85], [88], ...], ...],
    "shape": { "batch": 3, "sequence": 365, "features": 1 },
    "skus": ["SKU-001-WIDGET", "SKU-002-GADGET", "SKU-003-TOOL"],
    "dates": ["2024-01-01", "2024-01-02", ...]
  }
  ```
- **Key Detail:** FAIM expects normalized 3D arrays; this node handles the conversion

### 4. **FAIM Forecast Node**
- **Type:** @faim-group/n8n-nodes-faim.faimForecast
- **Model:** Chronos2 (advanced time-series forecasting)
- **Horizon:** 30 days
- **Input:** 3D array of historical quantities
- **Output:** Point forecasts for all SKUs
- **Credentials Required:**
  - FAIM API Key (set as environment variable: `FAIM_API_KEY`)
- **Response Schema:**
  ```json
  {
    "forecast": {
      "point": [
        [[120], [118], ..., [125]],  // SKU-001-WIDGET (30 days)
        [[85], [87], ..., [90]],      // SKU-002-GADGET (30 days)
        [[45], [44], ..., [48]]       // SKU-003-TOOL (30 days)
      ]
    },
    "metadata": {
      "modelName": "chronos2",
      "modelVersion": "1.0",
      "inputShape": { "batch": 3, "sequence": 365, "features": 1 },
      "outputShape": { "batch": 3, "horizon": 30, "features": 1 }
    }
  }
  ```
- **Description:** Executes FAIM's time-series forecasting API to generate future demand predictions

### 5. **Process Forecast Results**
- **Type:** n8n-nodes-base.code (JavaScript)
- **Purpose:** Transform raw FAIM output into business-readable format
- **Processes:**
  - Extracts point forecasts for each SKU
  - Maps predictions to future dates
  - Calculates daily totals across all SKUs
  - Ensures non-negative quantities (floor at 0)
- **Output:** Two datasets (passed separately to next node)
  ```json
  {
    "daily_forecasts": [
      {
        "date": "2025-01-16",
        "sku": "SKU-001-WIDGET",
        "predicted_quantity": 125,
        "day_of_forecast": 1,
        "confidence_level": "point_forecast"
      }
    ],
    "summary_by_day": [
      {
        "date": "2025-01-16",
        "total_quantity": 260,
        "sku_count": 3,
        "day_of_forecast": 1
      }
    ]
  }
  ```
- **Description:** Transforms model output into actionable business metrics

### 6. **Split for Google Sheets**
- **Type:** n8n-nodes-base.code (JavaScript)
- **Purpose:** Route data to two separate Google Sheets tabs
- **Functionality:**
  - Splits a single input into 2 outputs (using output indices)
  - Output 0: Daily SKU-level forecasts
  - Output 1: Daily summary totals
- **Why Split?** Allows parallel writes and separate analytics tracking
- **Description:** Distributes forecast data to different reporting sheets for granular and aggregate views

### 7. **Google Sheets - Daily SKU Forecasts**
- **Type:** n8n-nodes-base.googleSheets (v4)
- **Operation:** Append rows
- **Target Sheet:** "Daily_SKU_Forecasts"
- **Columns:** `Date | SKU | Predicted_Quantity | Day_Of_Forecast | Confidence`
- **Data Written:** 90 rows per execution (30 days × 3 SKUs)
- **Credentials Required:** Google Sheets OAuth2 (set as environment variable: `GOOGLE_SHEETS_OAUTH`)
- **Spreadsheet ID:** Stored as environment variable: `GOOGLE_SHEETS_ID`
- **Description:** Appends SKU-level demand predictions to Google Sheets for detailed analysis and visualization

### 8. **Google Sheets - Daily Summary Totals**
- **Type:** n8n-nodes-base.googleSheets (v4)
- **Operation:** Append rows
- **Target Sheet:** "Daily_Summary"
- **Columns:** `Date | Total_Quantity | SKU_Count | Day_Of_Forecast`
- **Data Written:** 30 rows per execution (30 days)
- **Credentials Required:** Google Sheets OAuth2
- **Spreadsheet ID:** Same spreadsheet as node 7
- **Description:** Appends aggregate daily demand totals to track overall forecast trends

### 9. **Workflow Summary**
- **Type:** n8n-nodes-base.noOp
- **Purpose:** End node with completion message
- **Description:** Marks successful pipeline completion; useful for logging and monitoring

---

## Setup Instructions

### 1. Prerequisites
- n8n instance (v1.0+)
- FAIM API key and credentials
- Google Sheets OAuth2 access
- Google Sheet with 2 tabs: "Daily_SKU_Forecasts" and "Daily_Summary"

### 2. Environment Variables
Create a `.env` file or set in n8n's environment:
```bash
FAIM_API_KEY=your_faim_api_key_here
GOOGLE_SHEETS_OAUTH=your_google_oauth_token_here
GOOGLE_SHEETS_ID=your_google_sheet_id_here
```

### 3. Google Sheets Setup
Create a new Google Sheet with 2 tabs:

**Tab 1: Daily_SKU_Forecasts**
- Headers: Date | SKU | Predicted_Quantity | Day_Of_Forecast | Confidence

**Tab 2: Daily_Summary**
- Headers: Date | Total_Quantity | SKU_Count | Day_Of_Forecast

### 4. Import Workflow
1. Open n8n UI
2. Click **Workflows** → **Import from File**
3. Select `shopify-demand-forecast-faim.json`
4. Configure credentials (FAIM API, Google Sheets OAuth2)
5. Verify environment variables are set
6. Test with "Execute Workflow" button

### 5. Production Deployment
Replace the Manual Trigger with a Schedule Trigger:
```json
{
  "name": "Schedule Trigger",
  "type": "n8n-nodes-base.scheduleTrigger",
  "parameters": {
    "rule": {
      "interval": [
        {
          "field": "cronExpression",
          "expression": "0 2 * * *"  // Daily at 2 AM
        }
      ]
    }
  }
}
```

---

## Data Flow Example

### Input: Historical Sales (365 days, 3 SKUs)
```
Date        | SKU-001 | SKU-002 | SKU-003
2024-01-01  |   120   |    85   |    45
2024-01-02  |   115   |    87   |    48
...
2025-01-14  |   125   |    90   |    50
```

### Model: FAIM Chronos2
Processes 3D tensor: `[3 batches][365 sequence][1 feature]`

### Output: 30-Day Forecast
```
Date        | SKU-001 | SKU-002 | SKU-003 | TOTAL
2025-01-15  |   126   |    91   |    51   |  268
2025-01-16  |   125   |    92   |    52   |  269
2025-01-17  |   128   |    93   |    51   |  272
...
2025-02-13  |   130   |    95   |    54   |  279
```

### Google Sheets Output
**Daily_SKU_Forecasts Tab:** 90 rows (30 days × 3 SKUs)
**Daily_Summary Tab:** 30 rows (aggregate totals per day)

---

## Customization Guide

### Change Forecast Horizon (e.g., 60 days instead of 30)
1. **Node 4 (FAIM Forecast Node):** Change `"horizon": 30` → `"horizon": 60`
2. **Node 5 (Process Results):** Update the loop: `for (let day = 0; day < 60; day++)`
3. **Update Google Sheets:** Adjust expected row counts (180 SKU-level, 60 summary)

### Add More SKUs
1. **Node 2 (Mock Shopify Orders):**
   ```javascript
   const skus = ['SKU-001-WIDGET', 'SKU-002-GADGET', 'SKU-003-TOOL', 'SKU-004-NEW'];
   const baseQuantities = {
     'SKU-001-WIDGET': 120,
     'SKU-002-GADGET': 85,
     'SKU-003-TOOL': 45,
     'SKU-004-NEW': 65  // New SKU
   };
   ```
2. **Node 4 (FAIM Forecast):** API automatically handles 4 batches
3. **Google Sheets:** Will have 120 SKU-level rows (30 days × 4)

### Use Real Shopify Data
Replace Node 2 with actual Shopify connector:
```json
{
  "name": "Fetch Orders from Shopify",
  "type": "n8n-nodes-base.shopify",
  "parameters": {
    "resource": "order",
    "operation": "getAll",
    "returnAll": true,
    "filters": {
      "status": "any",
      "financialStatus": "paid"
    }
  }
}
```

### Change FAIM Model
1. **Node 4 (FAIM Forecast):** Change `"model": "chronos2"` to:
   - `"flowstate"` - Fast, production-optimized
   - `"tirex"` - Long-horizon, sparse data specialist
2. **Update documentation** if using different model parameters

---

## Troubleshooting

### Error: "Missing FAIM API credentials"
- Verify `FAIM_API_KEY` environment variable is set
- Test connection in n8n Credentials page

### Error: "Google Sheets not found"
- Confirm `GOOGLE_SHEETS_ID` matches your spreadsheet
- Verify OAuth2 token is valid and has write permissions
- Check sheet names match exactly: "Daily_SKU_Forecasts" and "Daily_Summary"

### Empty Forecasts
- Verify mock data is generated (Node 2 output should have 1095 rows)
- Check FAIM node for API errors in execution logs
- Ensure input shape is `[3][365][1]`

### Sheets Not Writing
- Check Google Sheets credentials and OAuth scope (should include `https://www.googleapis.com/auth/spreadsheets`)
- Verify column names in "data" parameter match sheet headers
- Check for quota limits on Google Sheets API

---

## Real-World Use Cases

1. **Inventory Planning:** Use 30-day forecasts to optimize stock levels
2. **Production Scheduling:** Plan manufacturing based on predicted demand per SKU
3. **Demand-Driven Marketing:** Allocate budget to SKUs with forecast peaks
4. **Warehouse Management:** Arrange fulfillment centers based on regional forecasts
5. **Revenue Forecasting:** Combine predictions with pricing for financial planning

---

## Performance & Scaling

| Metric | Value |
|--------|-------|
| Historical Data | 365 days |
| SKUs | 3 |
| Forecast Horizon | 30 days |
| Total Predictions | 90 (30 × 3) |
| Execution Time | ~5-10 seconds |
| Google Sheets Writes | 2 (parallel) |
| Data Points Processed | 1,095 (365 × 3) |

**Scaling to 100 SKUs:**
- Add more mock SKUs in Node 2
- FAIM handles automatically (3D tensor scales to `[100][365][1]`)
- Google Sheets: 3,000 SKU-level rows + 30 summary rows per run
- Estimated execution time: ~15-20 seconds

---

## Educational Value

This workflow teaches:
1. **Time-Series Data Transformation:** Converting business data to ML-ready format
2. **3D Array Handling:** Working with batch/sequence/feature tensors
3. **N8N Code Nodes:** JavaScript for data generation and processing
4. **API Integration:** Connecting to specialized ML APIs (FAIM)
5. **Multi-Output Routing:** Splitting data for different downstream systems
6. **Google Sheets as Data Lake:** Writing predictions for analytics
7. **Production Patterns:** Proper error handling, logging, and scheduled execution

---

## Next Steps

- **Monitor Performance:** Track forecast accuracy vs. actual sales
- **Feedback Loop:** Retrain on recent data monthly
- **Cost Optimization:** Compare FAIM models (Chronos2 vs. FlowState) for cost/accuracy
- **Advanced Features:** Add confidence intervals, anomaly detection, or ensemble forecasting
- **Alerting:** Add notification nodes for anomalously high/low forecasts

---

## Support & Documentation

- **FAIM Documentation:** https://faim.group/docs
- **n8n Documentation:** https://docs.n8n.io
- **Google Sheets Integration:** https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/
- **Chronos2 Model Info:** https://faim.group/models/chronos2

---

**Workflow Version:** 1.0
**Last Updated:** 2025-01-15
**Status:** Production-Ready
**License:** MIT