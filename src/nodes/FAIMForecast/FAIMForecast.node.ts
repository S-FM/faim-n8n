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
    displayName: 'FAIM Forecast',
    name: 'faimForecast',
    group: ['transform'],
    version: 1,
    description: 'Generate time-series forecasts using FAIM ML models',
    defaults: {
      name: 'FAIM Forecast',
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
        type: 'options',
        default: 'chronos2',
        description: 'Forecast model to use',
        options: [
          { name: 'Chronos 2.0', value: 'chronos2' },
          { name: 'FlowState', value: 'flowstate' },
          { name: 'TiRex', value: 'tirex' },
        ],
      },
      {
        displayName: 'Model Version',
        name: 'modelVersion',
        type: 'string',
        default: '1',
        description: 'Version of the model to use',
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
          { name: 'Samples', value: 'samples' },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const results: INodeExecutionData[] = [];

    // Get credentials
    const credentials = await this.getCredentials('faimApi') as { apiKey: string };
    if (!credentials?.apiKey) {
      throw new NodeOperationError(this.getNode(), 'FAIM API key is required');
    }

    // Get node parameters
    const model = this.getNodeParameter('model', 0) as ModelType;
    const modelVersion = this.getNodeParameter('modelVersion', 0) as string;
    const horizon = this.getNodeParameter('horizon', 0) as number;
    const outputType = this.getNodeParameter('outputType', 0) as OutputType;

    // Initialize client
    const client = new ForecastClient({
      apiKey: credentials.apiKey,
    });

    // Process each item
    for (let i = 0; i < items.length; i++) {
      try {
        // Get input data
        let inputData = this.getNodeParameter('inputData', i);

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

        // Execute forecast
        const response = await client.forecast(
          model,
          modelVersion,
          inputData,
          horizon,
          outputType,
          {},
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
          // Include stack trace for debugging
          if (error.stack) {
            console.error('Full error stack:', error.stack);
          }
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