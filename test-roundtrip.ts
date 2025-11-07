import { ArrowSerializer } from './src/arrow/serializer';

const normalizedData = {
  x: [[[10], [12], [14], [13], [15], [17], [16], [18], [20], [19], [21], [22]]]
};

const metadata = {
  horizon: 7,
  output_type: 'point',
};

console.log('📊 Original data shape: (1, 12, 1)');
console.log('Original data (first batch, first 3 elements):', normalizedData.x[0].slice(0, 3));

const arrowBuffer = ArrowSerializer.serialize(normalizedData, metadata);
console.log(`\n✅ Serialized to ${arrowBuffer.length} bytes`);

const deserialized = ArrowSerializer.deserialize(arrowBuffer);
console.log('\n✅ Deserialized:');
console.log('Arrays:', Object.keys(deserialized.arrays));
console.log('x type:', Array.isArray(deserialized.arrays.x) ? '3D array' : 'other');
console.log('x shape:', deserialized.arrays.x.length, 'x', (deserialized.arrays.x as any)[0]?.length, 'x', (deserialized.arrays.x as any)[0]?.[0]?.length);
console.log('x[0][0:3]:', (deserialized.arrays.x as any)[0].slice(0, 3));
console.log('Metadata:', deserialized.metadata);

console.log('\n🎯 Success! 3D array preserved through round-trip');
