/**
 * End-to-end API test script
 * Tests Arrow serialization and actual API call to backend
 * Run: npx ts-node test-api.ts
 */

import { ForecastClient } from './src/api/forecastClient';
import { ShapeConverter } from './src/data/shapeConverter';
import { ArrowSerializer } from './src/arrow/serializer';

const API_KEY = process.env.FAIM_TEST_API_KEY
const BASE_URL = process.env.FAIM_API_BASE_URL || 'https://api.faim.it.com';

console.log('🧪 FAIM API End-to-End Test\n');
console.log(`📍 API URL: ${BASE_URL}`);
console.log(`🔑 Using API key: ${API_KEY.substring(0, 20)}...\n`);

async function test() {
  try {
    // Test 1: Arrow Serialization
    console.log('Test 1: Arrow Serialization');
    console.log('===========================\n');

    const testData = [10, 12, 14, 13, 15, 17, 16, 18, 20, 19, 21, 22];
    const normalized = ShapeConverter.normalize(testData);

    console.log('✅ Data normalized:');
    console.log(`   Input: ${JSON.stringify(testData)}`);
    console.log(`   Shape: (${normalized.batchSize}, ${normalized.sequenceLength}, ${normalized.features})\n`);

    // Serialize to Arrow
    const metadata = {
      horizon: 7,
      output_type: 'point',
    };

    const arrowBuffer = ArrowSerializer.serialize({ x: normalized.x }, metadata);
    console.log('✅ Arrow serialized:');
    console.log(`   Buffer size: ${arrowBuffer.length} bytes`);
    console.log(`   First 16 bytes (hex): ${Array.from(arrowBuffer.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}\n`);

    // Test 1b: Arrow Deserialization (verify round-trip)
    console.log('\nTest 1b: Arrow Deserialization (Roundtrip)');
    console.log('=========================================\n');

    const deserialized = ArrowSerializer.deserialize(arrowBuffer);
    console.log('✅ Arrow deserialized:');
    console.log(`   Arrays: ${Object.keys(deserialized.arrays).join(', ')}`);
    console.log(`   Array x shape: ${JSON.stringify(deserialized.arrays.x.shape || 'flat')}`);
    console.log(`   Array x length: ${JSON.stringify(deserialized.arrays.x).length} chars`);
    console.log(`   Metadata: ${JSON.stringify(deserialized.metadata)}\n`);

    // Test 2: Forecast API Call
    console.log('\nTest 2: Forecast API Call');
    console.log('=========================\n');

    const client = new ForecastClient({
      apiKey: API_KEY,
      baseUrl: BASE_URL,
      timeoutMs: 30000,
      maxRetries: 1,
    });

    console.log('📤 Sending forecast request...\n');
    const startTime = Date.now();

    const response = await client.forecast(
      'chronos2',
      '1',
      testData,
      7,
      'point',
      {}
    );

    const duration = Date.now() - startTime;

    console.log('✅ Forecast response received:');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Model: ${response.metadata.modelName}`);
    console.log(`   Version: ${response.metadata.modelVersion}`);
    console.log(`   Transaction ID: ${response.metadata.transactionId}`);
    console.log(`   Cost: ${response.metadata.costAmount} ${response.metadata.costCurrency}`);
    console.log(`   Input shape: (${response.metadata.inputShape.batch}, ${response.metadata.inputShape.sequence}, ${response.metadata.inputShape.features})`);
    console.log(`   Output shape: (${response.metadata.outputShape.batch}, ${response.metadata.outputShape.horizon}, ${response.metadata.outputShape.features})`);

    if (response.forecast.point) {
      console.log(`\n🎯 Forecast (7 steps ahead):`);
      const forecast = response.forecast.point[0][0]; // First batch, first feature
      console.log(`   Values: ${forecast.map((v: number) => v.toFixed(2)).join(', ')}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS PASSED! Arrow serialization and API communication working!');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(80));
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

test();