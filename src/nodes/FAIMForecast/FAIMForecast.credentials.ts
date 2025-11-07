import { ICredentialType } from 'n8n-workflow';

// Note: Class name must be 'FAIMForecast' for n8n's auto-discovery
// (expects filename match for credentials)
export class FAIMForecast implements ICredentialType {
  name = 'faimApi';
  displayName = 'FAIM API Key';
  documentationUrl = 'https://faim.ai/docs/api-keys';
  properties = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string' as const,
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      placeholder: 'sk-xxxxxxxxxxxxxxxxxx',
      description: 'API key for FAIM forecast service (format: sk-...)',
    },
  ];
}