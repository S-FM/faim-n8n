/**
 * Jest setup file for configuring test environment
 */

// Set longer timeout for API-related tests
jest.setTimeout(30000);

// Note: ForecastClient now uses n8n's this.helpers.httpRequest instead of axios
// Tests that use ForecastClient should mock n8n's httpRequest helper in the IExecuteFunctions context