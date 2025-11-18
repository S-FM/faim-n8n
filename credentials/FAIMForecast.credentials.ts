import {
	IAuthenticateGeneric,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FAIMForecast implements ICredentialType {
	name = 'faimApi';
	displayName = 'FAIM API';
	icon = 'file:faim.png' as const;
	documentationUrl = 'https://faim.it.com/api-docs';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			placeholder: 'api_key_1_xxxxxxxxxxxxxxxxxxxxx',
			description: 'API key for FAIM forecast service. Get one at https://faim.it.com',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};
}