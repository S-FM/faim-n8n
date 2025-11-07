/**
 * Jest setup file for configuring test environment
 */

// Set longer timeout for API-related tests
jest.setTimeout(30000);

// Mock axios for API tests
jest.mock('axios');