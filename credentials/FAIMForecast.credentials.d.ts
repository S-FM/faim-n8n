import { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';
export declare class FAIMForecast implements ICredentialType {
    name: string;
    displayName: string;
    icon: "file:faim.png";
    documentationUrl: string;
    properties: INodeProperties[];
    authenticate: IAuthenticateGeneric;
    test: ICredentialTestRequest;
}
//# sourceMappingURL=FAIMForecast.credentials.d.ts.map