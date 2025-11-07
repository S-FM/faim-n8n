# Quick Start - Local FAIM n8n Node Testing

## Status ✅

Your FAIM Forecast n8n node is installed and running!

- **n8n running at**: http://localhost:5678
- **Node installed in**: ~/.n8n/custom/faim-forecast-node
- **Tests passing**: 12/12 ✅

## How to Test Your Node

### Option 1: Create Workflow in Web UI (Recommended for First Test)

1. **Open n8n**
   ```bash
   # Already running, just open browser:
   open http://localhost:5678
   ```

2. **Create New Workflow**
   - Click "+" → "New Workflow"
   - Save with name "FAIM Test"

3. **Add Nodes**
   - Drag "Start" node (should be there by default)
   - Click "+" → Search "Set" → Add "Set" node
   - Click "+" → Search "FAIM" → Add "FAIM Forecast" node

4. **Configure Set Node**
   - In "Set" node, click "Add Value"
   - Key: `timeSeries`
   - Value (JSON): `[10, 12, 14, 13, 15, 17, 16, 18, 20, 19, 21, 22]`

5. **Configure FAIM Forecast Node**
   - Click FAIM Forecast node
   - **Credentials**: You'll need to create credentials first:
     - Click "Create New" next to credential dropdown
     - Name: "FAIM API Key"
     - API Key: Enter your test key (format: `sk-...`)
   - **Model**: Select "Chronos 2.0"
   - **Model Version**: `1`
   - **Input Data**: `{{ $json.timeSeries }}`
   - **Horizon**: `7`
   - **Output Type**: `Point`

6. **Connect Nodes**
   - Click output circle on "Start" → drag to "Set" input
   - Click output circle on "Set" → drag to "FAIM" input

7. **Test Execution**
   - Click "Execute Workflow"
   - Check Results tab for forecast output

### Option 2: Import Test Workflow

```bash
# Copy test workflow to n8n data directory
cp test-workflow.json ~/.n8n/workflows/

# Then in UI:
# 1. Open http://localhost:5678
# 2. Click "Open"
# 3. Select "FAIM Forecast - Local Test"
# 4. Update credentials
# 5. Execute
```

### Option 3: CLI Test (No API needed)

```bash
# Run local tests to verify core functionality
npx ts-node test-locally.ts

# Output should show:
# ✅ 1D array conversion
# ✅ 2D array conversion
# ✅ 3D array conversion
# ✅ Request built successfully
# ✅ Validation error caught
# ✅ Input validation tests pass
```

## Expected Forecast Output

When everything works, the node returns:

```json
{
  "forecast": {
    "point": [
      [[23], [24], [25], [26], [27], [28], [29]]
    ]
  },
  "metadata": {
    "modelName": "chronos2",
    "modelVersion": "1",
    "transactionId": "...",
    "costAmount": "...",
    "costCurrency": "USD",
    "inputShape": {
      "batch": 1,
      "sequence": 12,
      "features": 1
    },
    "outputShape": {
      "batch": 1,
      "horizon": 7,
      "features": 1
    }
  },
  "executionStats": {
    "durationMs": 1234,
    "retryCount": 0,
    "batchSize": 1
  }
}
```

## Node Features

✅ **Models**: Chronos2, FlowState, TiRex
✅ **Input Formats**: Auto-converts 1D, 2D, 3D arrays
✅ **Horizon**: 1-1000 steps ahead
✅ **Output Types**: Point, Quantiles, Samples
✅ **Error Handling**: Detailed error messages for validation/API errors
✅ **Retry Logic**: Automatic retry with exponential backoff
✅ **Metadata**: Full forecast metadata and execution stats

## Troubleshooting

### Node not appearing in UI?
```bash
# Restart n8n
pkill -f "n8n"
sleep 2
cd ~/.n8n && n8n start &
sleep 5
# Reload browser at http://localhost:5678
```

### "API key is required" error?
- Make sure you created credentials in n8n
- Format: `sk-xxxxxxxxxxxxxxxx`
- It's stored securely in n8n's database

### "ValidationError: horizon must be between 1 and 1000"?
- Check your horizon value is a valid number
- Must be between 1 and 1000 inclusive

### Input data validation errors?
- Data must be numeric arrays only
- No null, undefined, or non-numeric values
- All rows in 2D arrays must have same length
- Empty arrays not allowed

## Useful Commands

```bash
# Build project
pnpm run build

# Run all tests
pnpm run test

# Run with coverage report
pnpm run test:coverage

# Check code quality
pnpm run lint

# Run local tests without n8n
npx ts-node test-locally.ts

# View n8n logs
tail -f /tmp/n8n.log

# Stop n8n
pkill -f "n8n"

# List n8n credentials
curl -s http://localhost:5678/api/v1/credentials -H "X-N8N-API-KEY: your-api-key" | jq
```

## Next Steps

1. **Test with Real API**
   - Get actual FAIM API key
   - Update credentials in n8n
   - Test forecast on real data

2. **Create Production Workflows**
   - Database input nodes
   - Schedule forecast runs
   - Save results to database
   - Send alerts on anomalies

3. **Deploy to Production**
   - Follow npm publishing guide
   - Register with n8n community
   - Set up production n8n instance
   - Configure multiple environments

## Files Reference

- **Node Code**: `src/nodes/FAIMForecast/FAIMForecast.node.ts`
- **Tests**: `tests/*.test.ts`
- **API Client**: `src/api/forecastClient.ts`
- **Configuration**: `package.json`, `tsconfig.json`
- **Documentation**: `README.md`, `EXAMPLES.md`, `DEVELOPMENT.md`

## Support Resources

- n8n Docs: https://docs.n8n.io
- FAIM API Docs: https://faim.ai/docs/api
- Project Documentation: See `README.md`, `QUICKSTART.md`, `EXAMPLES.md`

---

**Need help?** Check the docs or run the test suite to verify everything is working!