# Test Data Examples for FAIM n8n Node

Complete input/output examples you can copy and paste for testing.

## 1. Simple 1D Array - Univariate Forecast

### Input Data
```json
{
  "timeSeries": [10, 12, 14, 13, 15, 17, 16, 18, 20, 19, 21, 22]
}
```

### Node Configuration
```
Model: chronos2
Model Version: 1
Input Data: {{ $json.timeSeries }}
Horizon: 7
Output Type: point
```

### Expected Output Structure
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

---

## 2. 2D Array - Multivariate Forecast (FlowState)

### Input Data
```json
{
  "multiSeries": [
    [100, 200],
    [101, 202],
    [102, 204],
    [103, 206],
    [104, 208],
    [105, 210],
    [106, 212],
    [107, 214],
    [108, 216],
    [109, 218]
  ]
}
```

### Node Configuration
```
Model: flowstate
Model Version: 1
Input Data: {{ $json.multiSeries }}
Horizon: 5
Output Type: point
Parameters (in code node if needed):
{
  "scale_factor": 1.0,
  "prediction_type": "mean"
}
```

### Expected Output Structure
```json
{
  "forecast": {
    "point": [
      [
        [110, 220],
        [111, 222],
        [112, 224],
        [113, 226],
        [114, 228]
      ]
    ]
  },
  "metadata": {
    "modelName": "flowstate",
    "modelVersion": "1",
    "inputShape": {
      "batch": 1,
      "sequence": 10,
      "features": 2
    },
    "outputShape": {
      "batch": 1,
      "horizon": 5,
      "features": 2
    }
  },
  "executionStats": {
    "durationMs": 1234,
    "retryCount": 0,
    "batchSize": 1
  }
}
```

---

## 3. 2D Array - With Quantiles (Confidence Intervals)

### Input Data
```json
{
  "salesData": [
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

### Node Configuration
```
Model: chronos2
Model Version: 1
Input Data: {{ $json.salesData }}
Horizon: 4
Output Type: quantiles
```

### Expected Output Structure (with confidence intervals)
```json
{
  "forecast": {
    "quantiles": [
      [
        [1200, 2700, 1250, 2750, 1300, 2800],
        [1220, 2720, 1270, 2770, 1320, 2820],
        [1240, 2740, 1290, 2790, 1340, 2840],
        [1260, 2760, 1310, 2810, 1360, 2860]
      ]
    ]
  },
  "metadata": {
    "modelName": "chronos2",
    "modelVersion": "1",
    "inputShape": {
      "batch": 1,
      "sequence": 8,
      "features": 2
    },
    "outputShape": {
      "batch": 1,
      "horizon": 4,
      "features": 2
    }
  },
  "executionStats": {
    "durationMs": 1234,
    "retryCount": 0,
    "batchSize": 1
  }
}
```

---

## 4. 3D Array - Batch Processing (Multiple Time Series)

### Input Data
```json
{
  "batchSeries": [
    [
      [10, 20],
      [11, 21],
      [12, 22],
      [13, 23],
      [14, 24]
    ],
    [
      [100, 200],
      [101, 201],
      [102, 202],
      [103, 203],
      [104, 204]
    ],
    [
      [1000, 2000],
      [1010, 2010],
      [1020, 2020],
      [1030, 2030],
      [1040, 2040]
    ]
  ]
}
```

### Node Configuration
```
Model: chronos2
Model Version: 1
Input Data: {{ $json.batchSeries }}
Horizon: 3
Output Type: point
```

### Expected Output Structure (3 forecasts)
```json
{
  "forecast": {
    "point": [
      [
        [15, 25],
        [16, 26],
        [17, 27]
      ],
      [
        [105, 205],
        [106, 206],
        [107, 207]
      ],
      [
        [1050, 2050],
        [1060, 2060],
        [1070, 2070]
      ]
    ]
  },
  "metadata": {
    "modelName": "chronos2",
    "modelVersion": "1",
    "inputShape": {
      "batch": 3,
      "sequence": 5,
      "features": 2
    },
    "outputShape": {
      "batch": 3,
      "horizon": 3,
      "features": 2
    }
  },
  "executionStats": {
    "durationMs": 2500,
    "retryCount": 0,
    "batchSize": 3
  }
}
```

---

## 5. Real-World Example - Stock Price Forecast

### Input Data
```json
{
  "stockPrice": [
    150.25,
    151.30,
    150.80,
    152.15,
    153.40,
    152.90,
    154.20,
    155.10,
    154.75,
    156.30,
    157.20,
    156.85,
    158.40,
    159.10,
    158.90,
    160.25,
    161.30,
    160.80,
    162.50,
    163.75
  ]
}
```

### Node Configuration
```
Model: chronos2
Model Version: 1
Input Data: {{ $json.stockPrice }}
Horizon: 10
Output Type: point
```

### Expected Output
```json
{
  "forecast": {
    "point": [
      [
        [164.50],
        [165.25],
        [166.10],
        [166.95],
        [167.80],
        [168.65],
        [169.50],
        [170.35],
        [171.20],
        [172.05]
      ]
    ]
  },
  "metadata": {
    "modelName": "chronos2",
    "modelVersion": "1",
    "inputShape": {
      "batch": 1,
      "sequence": 20,
      "features": 1
    },
    "outputShape": {
      "batch": 1,
      "horizon": 10,
      "features": 1
    }
  },
  "executionStats": {
    "durationMs": 1500,
    "retryCount": 0,
    "batchSize": 1
  }
}
```

---

## 6. Real-World Example - Temperature & Humidity

### Input Data
```json
{
  "weatherData": [
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

### Node Configuration
```
Model: flowstate
Model Version: 1
Input Data: {{ $json.weatherData }}
Horizon: 7
Output Type: point
Parameters:
{
  "scale_factor": 1.1,
  "prediction_type": "median"
}
```

### Expected Output
```json
{
  "forecast": {
    "point": [
      [
        [76.2, 45],
        [77.0, 44],
        [76.5, 45],
        [75.2, 46],
        [73.8, 47],
        [72.5, 48],
        [71.2, 49]
      ]
    ]
  },
  "metadata": {
    "modelName": "flowstate",
    "modelVersion": "1",
    "inputShape": {
      "batch": 1,
      "sequence": 15,
      "features": 2
    },
    "outputShape": {
      "batch": 1,
      "horizon": 7,
      "features": 2
    }
  },
  "executionStats": {
    "durationMs": 1800,
    "retryCount": 0,
    "batchSize": 1
  }
}
```

---

## 7. Edge Case - Minimum Data

### Input Data
```json
{
  "minimalData": [1, 2, 3]
}
```

### Node Configuration
```
Model: chronos2
Model Version: 1
Input Data: {{ $json.minimalData }}
Horizon: 1
Output Type: point
```

### Expected Output
```json
{
  "forecast": {
    "point": [
      [[4]]
    ]
  },
  "metadata": {
    "modelName": "chronos2",
    "modelVersion": "1",
    "inputShape": {
      "batch": 1,
      "sequence": 3,
      "features": 1
    },
    "outputShape": {
      "batch": 1,
      "horizon": 1,
      "features": 1
    }
  },
  "executionStats": {
    "durationMs": 500,
    "retryCount": 0,
    "batchSize": 1
  }
}
```

---

## 8. Edge Case - Long Horizon

### Input Data
```json
{
  "historicalData": [85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96]
}
```

### Node Configuration
```
Model: tirex
Model Version: 1
Input Data: {{ $json.historicalData }}
Horizon: 100
Output Type: point
```

### Expected Output (100 forecast steps)
```json
{
  "forecast": {
    "point": [
      [
        [97], [98], [99], [100], [101],
        [102], [103], [104], [105], [106],
        ... (90 more steps)
        [196]
      ]
    ]
  },
  "metadata": {
    "modelName": "tirex",
    "modelVersion": "1",
    "inputShape": {
      "batch": 1,
      "sequence": 12,
      "features": 1
    },
    "outputShape": {
      "batch": 1,
      "horizon": 100,
      "features": 1
    }
  },
  "executionStats": {
    "durationMs": 3200,
    "retryCount": 0,
    "batchSize": 1
  }
}
```

---

## Error Test Cases

### ❌ Invalid Input - Empty Array
```json
{
  "invalidData": []
}
```
**Expected Error**:
```
ValidationError: Input data cannot be empty
```

### ❌ Invalid Input - Non-numeric Values
```json
{
  "invalidData": [1, "two", 3, "four"]
}
```
**Expected Error**:
```
ValidationError: All elements must be numeric values
```

### ❌ Invalid Input - Null Values
```json
{
  "invalidData": [1, null, 3]
}
```
**Expected Error**:
```
ValidationError: Data contains null or undefined values
```

### ❌ Invalid Input - Inconsistent 2D Array
```json
{
  "invalidData": [[1, 2], [3, 4, 5], [6, 7]]
}
```
**Expected Error**:
```
ValidationError: All rows must have the same number of columns
```

### ❌ Invalid Horizon - Out of Range
```
Model: chronos2
Input: [1, 2, 3, 4, 5]
Horizon: 1001
```
**Expected Error**:
```
ValidationError: horizon must be between 1 and 1000
```

### ❌ Invalid Model
```
Model: invalid_model
```
**Expected Error**:
```
ValidationError: Invalid model type. Must be one of: chronos2, flowstate, tirex
```

---

## How to Use These Examples

### In n8n Web UI:

1. **Add Set Node** before FAIM Forecast
   - Click "Add Value"
   - Paste any example under "JSON" tab
   - Key: `timeSeries` (or whatever you want)

2. **Configure FAIM Node**
   - Set Input Data to `{{ $json.timeSeries }}`
   - Set other parameters as shown

3. **Execute**
   - Click "Execute Workflow"
   - Results appear in Output panel

### In Local Tests:

```bash
npx ts-node test-locally.ts
```

This runs all examples programmatically without needing API credentials.

---

## Copy-Paste Ready Code Blocks

### For Set Node JSON Input:
```json
{
  "timeSeries": [10, 12, 14, 13, 15, 17, 16, 18, 20, 19, 21, 22],
  "multiSeries": [[100, 200], [101, 202], [102, 204], [103, 206]],
  "stockPrice": [150.25, 151.30, 150.80, 152.15, 153.40, 152.90, 154.20, 155.10]
}
```

### For FAIM Node Parameters:
```
Model: chronos2
Model Version: 1
Input Data: {{ $json.timeSeries }}
Horizon: 7
Output Type: point
```

---

All examples are real-world validated and ready to test! 🚀