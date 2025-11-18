"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAIMForecast = void 0;
class FAIMForecast {
    constructor() {
        this.name = 'faimApi';
        this.displayName = 'FAIM API';
        this.icon = 'file:faim.png';
        this.documentationUrl = 'https://faim.it.com/api-docs';
        this.properties = [
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
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    Authorization: '=Bearer {{$credentials.apiKey}}',
                },
            },
        };
        this.test = {
            request: {
                baseURL: 'https://api.faim.it.com',
                url: '/v1/health',
                method: 'GET',
            },
        };
    }
}
exports.FAIMForecast = FAIMForecast;
//# sourceMappingURL=FAIMForecast.credentials.js.map