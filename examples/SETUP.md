# Quick Setup Guide: Shopify Demand Forecast with FAIM

## 5-Minute Setup

### Step 1: Create Environment Variables
Create `.env` file in your n8n project root:
```bash
FAIM_API_KEY=your_api_key_here
GOOGLE_SHEETS_ID=1abc...xyz  # Copy from your Google Sheet URL
GOOGLE_SHEETS_OAUTH=your_oauth_token
```

### Step 2: Setup Google Sheets
1. Create new Google Sheet
2. Add two sheets:
   - Tab 1: `Daily_SKU_Forecasts` with headers:
     ```
     Date | SKU | Predicted_Quantity | Day_Of_Forecast | Confidence
     ```
   - Tab 2: `Daily_Summary` with headers:
     ```
     Date | Total_Quantity | SKU_Count | Day_Of_Forecast
     ```
3. Share sheet with your Google service account or OAuth app
4. Copy Sheet ID from URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`

### Step 3: Import Workflow
```bash
# Option A: Via n8n UI
1. Open n8n → Workflows → Import from File
2. Select: shopify-demand-forecast-faim.json
3. Click "Import"

# Option B: Via API
curl -X POST http://localhost:5678/api/v1/workflows/import \
  -H "X-N8N-API-KEY: your_api_key" \
  -F "file=@shopify-demand-forecast-faim.json"
```

### Step 4: Configure Credentials
1. **FAIM API:**
   - Go to Workflow → Credentials
   - Add new FAIM credential with your API key
   - Link to "FAIM Forecast Node"

2. **Google Sheets OAuth2:**
   - Go to Workflow → Credentials
   - Create new Google Sheets OAuth2
   - Authorize with your Google account
   - Link to both Sheets nodes

### Step 5: Test
1. Click "Execute Workflow" button
2. Check execution logs for errors
3. Verify data appears in Google Sheets within 10 seconds

---

## Deployment Checklist

- [ ] FAIM API key configured and tested
- [ ] Google Sheets OAuth2 authenticated
- [ ] Google Sheet with correct sheet names created
- [ ] Environment variables set (`FAIM_API_KEY`, `GOOGLE_SHEETS_ID`)
- [ ] Workflow imported successfully
- [ ] Test execution completes without errors
- [ ] Data appears in Google Sheets
- [ ] (Optional) Schedule trigger configured for production
- [ ] (Optional) Error notifications set up

---

## Running the Workflow

### Manual Execution
```bash
# Via n8n UI
Click "Execute Workflow" button

# Via API
curl -X POST http://localhost:5678/api/v1/workflows/123/execute \
  -H "X-N8N-API-KEY: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Scheduled Execution (Production)
Replace "Manual Trigger" node with:
```json
{
  "name": "Schedule Trigger",
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1,
  "parameters": {
    "rule": {
      "interval": [
        {
          "field": "cronExpression",
          "expression": "0 2 * * *"  // Daily 2 AM UTC
        }
      ]
    }
  }
}
```

---

## Expected Output

### Execution Time
- ~5-10 seconds total (depending on API latency)

### Google Sheets Output
**Daily_SKU_Forecasts Sheet:**
```
Date       | SKU             | Predicted_Quantity | Day | Confidence
2025-01-15 | SKU-001-WIDGET  | 125                | 1   | point_forecast
2025-01-15 | SKU-002-GADGET  | 91                 | 1   | point_forecast
2025-01-15 | SKU-003-TOOL    | 51                 | 1   | point_forecast
...
```

**Daily_Summary Sheet:**
```
Date       | Total_Quantity | SKU_Count | Day
2025-01-15 | 267            | 3         | 1
2025-01-16 | 271            | 3         | 2
...
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "FAIM_API_KEY not found" | Check .env file exists and `source .env` before running |
| "Spreadsheet not found" | Verify `GOOGLE_SHEETS_ID` matches URL exactly |
| "Authentication failed" | Re-authenticate Google OAuth2 credentials |
| "Empty data in Sheets" | Check Node 2 output has 1095 rows of mock data |
| "API timeout" | Increase timeout in FAIM node parameters to 60s |

---

## What Gets Generated?

✓ **365 days** of historical sales data (3 SKUs)
✓ **30-day forecast** for each SKU
✓ **90 rows** written to Google Sheets per execution (30 days × 3 SKUs)
✓ **30 rows** of daily totals
✓ **Model metadata** logged (version, input/output shapes)

---

## Next: Customize

### Add More SKUs
Edit Node 2 (Mock Shopify Orders) - change `skus` array and `baseQuantities`

### Change Forecast Duration
Edit Node 4 - change `horizon` from 30 to desired days
Edit Node 5 - change loop to match new horizon

### Use Real Shopify Data
Replace Node 2 with actual Shopify REST API node

### Add Confidence Intervals
Use `flowstate` model instead of `chronos2` in Node 4

---

**Questions?** See `SHOPIFY_FORECAST_GUIDE.md` for detailed documentation.