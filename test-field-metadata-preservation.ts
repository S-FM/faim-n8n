import * as arrow from 'apache-arrow';

// Test: RecordBatch approach to preserve field metadata

const field = new arrow.Field('test', new arrow.Float64(), true, new Map([['shape', '[1,2,3]']]));
const vector = arrow.vectorFromArray([1, 2, 3, 4, 5, 6], new arrow.Float64());

const schema = new arrow.Schema([field], new Map([['user_meta', 'test']]));

console.log('Original schema field metadata:', schema.fields[0].metadata);
console.log('Original schema metadata:', schema.metadata);

// Create RecordBatch with our schema
const batch = new arrow.RecordBatch(schema, vector.length, [vector]);
console.log('\nRecordBatch schema fields:', batch.schema.fields.map(f => ({ name: f.name, metadata: f.metadata })));

// Create table from batch
const table = new arrow.Table(schema, [batch]);
console.log('Table schema fields:', table.schema.fields.map(f => ({ name: f.name, metadata: f.metadata })));

// Serialize
const ipcBuffer = arrow.tableToIPC(table, 'stream');
console.log('\nSerialized to', ipcBuffer.length, 'bytes');

// Deserialize
const deserialized = arrow.tableFromIPC(ipcBuffer);
console.log('Deserialized schema fields:', deserialized.schema.fields.map(f => ({ name: f.name, metadata: f.metadata })));
console.log('Deserialized schema metadata:', deserialized.schema.metadata);
