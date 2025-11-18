import {
  INodeType,
  INodeTypeDescription,
  IExecuteFunctions,
  INodeExecutionData,
  NodeOperationError,
  IDataObject,
} from 'n8n-workflow';

import { ForecastClient } from '../../api/forecastClient';
import { FaimError } from '../../errors/customErrors';
import { ErrorHandler } from '../../errors/errorHandler';
import { ModelType, OutputType } from '../../api/requestBuilder';

export class FAIMForecast implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'FAIM Time-Series Forecasting',
    name: 'faimForecast',
    group: ['transform'],
    version: 1,
    description: 'Generate time-series forecasts using FAIM ML models (Chronos 2.0, FlowState, TiRex). Visit https://faim.it.com/ to learn more.',
    documentationUrl: 'https://faim.it.com/api-docs',
    icon: 'file:faim.png',
    defaults: {
      name: 'FAIM Time-Series Forecasting',
      color: '#007AFF',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'faimApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Model',
        name: 'model',
        type: 'hidden',
        default: 'chronos2',
        description: 'Forecast model (Chronos 2.0)',
      },
      {
        displayName: 'Input Data',
        name: 'inputData',
        type: 'string',
        default: '',
        required: true,
        description: 'Time series data as JSON array or expression. Examples: [1,2,3] or {{ $json.myArray }}',
      },
      {
        displayName: 'Forecast Horizon',
        name: 'horizon',
        type: 'number',
        default: 24,
        required: true,
        description: 'Number of future time steps to forecast (1-1000)',
      },
      {
        displayName: 'Output Type',
        name: 'outputType',
        type: 'options',
        default: 'point',
        description: 'Type of forecast output',
        options: [
          { name: 'Point', value: 'point' },
          { name: 'Quantiles', value: 'quantiles' },
        ],
      },
      {
        displayName: 'Quantiles',
        name: 'quantiles',
        type: 'string',
        default: '[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9]',
        typeOptions: {
          rows: 2,
        },
        description: 'Quantiles to forecast (JSON array format). Example: [0.1,0.5,0.9]',
        displayOptions: {
          show: {
            outputType: ['quantiles'],
            model: ['chronos2'],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const results: INodeExecutionData[] = [];

    // Get credentials
    const credentials = await this.getCredentials('faimApi');
    if (typeof credentials === 'undefined' || credentials === null || typeof credentials.apiKey !== 'string') {
      throw new NodeOperationError(this.getNode(), 'FAIM API key is required');
    }

    // Get node parameters
    const model = this.getNodeParameter('model', 0) as ModelType;
    const modelVersion = '1'; // Always use version 1
    const horizon = this.getNodeParameter('horizon', 0) as number;
    const outputType = this.getNodeParameter('outputType', 0) as OutputType;

    // Initialize client with n8n context for httpRequest helper
    const client = new ForecastClient(
      {
        apiKey: String(credentials.apiKey),
      },
      this,
    );

    // Process each item
    for (let i = 0; i < items.length; i++) {
      try {
        // Get input data
        let inputData: unknown = this.getNodeParameter('inputData', i);

        // Parse string input if needed
        if (typeof inputData === 'string') {
          try {
            inputData = JSON.parse(inputData);
          } catch {
            throw new NodeOperationError(
              this.getNode(),
              'Input Data must be valid JSON array. Examples: [1,2,3] or {{ $json.myArray }}',
              { itemIndex: i },
            );
          }
        }

        // Build parameters
        const parameters: Record<string, unknown> = {};

        // Add quantiles parameter if output type is quantiles and model is chronos2
        if (outputType === 'quantiles' && model === 'chronos2') {
          const quantilesStr = this.getNodeParameter('quantiles', i) as string;
          try {
            parameters.quantiles = JSON.parse(quantilesStr);
          } catch {
            throw new NodeOperationError(
              this.getNode(),
              'Quantiles must be a valid JSON array. Example: [0.1,0.5,0.9]',
              { itemIndex: i },
            );
          }
        }

        // Execute forecast
        const response = await client.forecast(
          model,
          modelVersion,
          inputData,
          horizon,
          outputType,
          parameters,
        );

        // Add result
        results.push({
          json: response as unknown as IDataObject,
          pairedItem: { item: i },
        });
      } catch (error) {
        // Handle error with detailed information
        let errorMessage = 'Unknown error occurred';

        if (error instanceof FaimError) {
          errorMessage = ErrorHandler.getUserMessage(error);
        } else if (error instanceof Error) {
          errorMessage = `${error.name}: ${error.message}`;
        } else {
          errorMessage = String(error);
        }

        throw new NodeOperationError(
          this.getNode(),
          errorMessage,
          { itemIndex: i },
        );
      }
    }

    return [results];
  }
}