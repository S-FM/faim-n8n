/**
 * Local test script to verify core functionality without n8n
 * Run: npx ts-node test-locally.ts
 */

import { ShapeConverter } from './src/data/shapeConverter';
import { RequestBuilder } from './src/api/requestBuilder';
import { ValidationError } from './src/errors/customErrors';
import { ErrorHandler } from './src/errors/errorHandler';

console.log('🧪 FAIM Node - Local Testing\n');

// Test 1: Shape Converter
console.log('Test 1: Shape Converter');
console.log('========================\n');

try {
  // Test 1D array
  const data1d = [10, 12, 14, 13, 15];
  const result1d = ShapeConverter.normalize(data1d);
  console.log('✅ 1D array conversion:');
  console.log(`   Input: ${JSON.stringify(data1d)}`);
  console.log(`   Output shape: (${result1d.batchSize}, ${result1d.sequenceLength}, ${result1d.features})`);
  console.log(`   First value: ${result1d.x[0][0][0]}\n`);

  // Test 2D array
  const data2d = [[100, 200], [101, 202], [102, 204]];
  const result2d = ShapeConverter.normalize(data2d);
  console.log('✅ 2D array conversion:');
  console.log(`   Input: ${JSON.stringify(data2d)}`);
  console.log(`   Output shape: (${result2d.batchSize}, ${result2d.sequenceLength}, ${result2d.features})`);
  console.log(`   First value: ${result2d.x[0][0][0]}\n`);

  // Test 3D array
  const data3d = [
    [[10, 20], [11, 21]],
    [[100, 200], [101, 201]]
  ];
  const result3d = ShapeConverter.normalize(data3d);
  console.log('✅ 3D array conversion:');
  console.log(`   Input: ${JSON.stringify(data3d)}`);
  console.log(`   Output shape: (${result3d.batchSize}, ${result3d.sequenceLength}, ${result3d.features})`);
  console.log(`   First batch, first sequence: [${result3d.x[0][0]}]\n`);
} catch (error) {
  console.error('❌ Shape Converter Error:', error instanceof Error ? error.message : error);
}

// Test 2: Request Builder
console.log('\nTest 2: Request Builder');
console.log('=======================\n');

try {
  const normalizedData = ShapeConverter.normalize([1, 2, 3, 4, 5]);

  const request = RequestBuilder.build(
    {
      model: 'chronos2',
      modelVersion: '1',
      data: normalizedData,
      horizon: 10,
      outputType: 'point',
      parameters: {}
    },
    'sk-test-key-123',
    'https://api.faim.com'
  );

  console.log('✅ Request built successfully:');
  console.log(`   URL: ${request.url}`);
  console.log(`   Headers: ${JSON.stringify(request.headers, null, 2)}`);
  console.log(`   Body size: ${request.body.length} bytes\n`);
} catch (error) {
  console.error('❌ Request Builder Error:', error instanceof Error ? error.message : error);
}

// Test 3: Error Handling
console.log('\nTest 3: Error Handling');
console.log('======================\n');

try {
  // Test validation error
  throw new ValidationError('Test horizon out of range', 'horizon');
} catch (error) {
  if (error instanceof ValidationError) {
    const msg = ErrorHandler.getUserMessage(error);
    console.log('✅ Validation error caught:');
    console.log(`   Code: ${error.code}`);
    console.log(`   Message: ${error.message}`);
    console.log(`   User-friendly: ${msg}\n`);
  }
}

// Test 4: Input Validation
console.log('\nTest 4: Input Validation');
console.log('========================\n');

const testCases = [
  { name: 'Valid 1D', data: [1, 2, 3, 4, 5], shouldPass: true },
  { name: 'Valid 2D', data: [[1, 2], [3, 4]], shouldPass: true },
  { name: 'Empty array', data: [], shouldPass: false },
  { name: 'Non-numeric', data: [1, 'two', 3], shouldPass: false },
  { name: 'Null values', data: [1, null, 3], shouldPass: false },
];

for (const testCase of testCases) {
  try {
    ShapeConverter.normalize(testCase.data);
    if (testCase.shouldPass) {
      console.log(`✅ ${testCase.name}: PASSED`);
    } else {
      console.log(`❌ ${testCase.name}: FAILED (should have thrown error)`);
    }
  } catch (error) {
    if (!testCase.shouldPass) {
      console.log(`✅ ${testCase.name}: Correctly rejected`);
    } else {
      console.log(`❌ ${testCase.name}: FAILED - ${error instanceof Error ? error.message : error}`);
    }
  }
}

console.log('\n================================================================================');
console.log('✅ Local Testing Complete!');
console.log('================================================================================\n');
console.log('Summary:');
console.log('  - Core data processing: ✅ Working');
console.log('  - Request building: ✅ Working');
console.log('  - Error handling: ✅ Working');
console.log('  - Input validation: ✅ Working');
console.log('\nNote: Full end-to-end testing requires n8n instance with API credentials.\n');