import * as arrow from 'apache-arrow';

// Test 1: Create field with metadata
const field = new arrow.Field('test', new arrow.Float64(), true, new Map([['shape', '[1,2,3]']]));
console.log('Field created:', field.name);
console.log('Field metadata:', field.metadata);

// Test 2: Create schema with field
const schema = new arrow.Schema([field]);
console.log('\nSchema fields:', schema.fields.map(f => ({ name: f.name, metadata: f.metadata })));

// Test 3: Create table from vectors
const vector = arrow.vectorFromArray([1, 2, 3, 4, 5, 6], new arrow.Float64());
const table = new arrow.Table({ test: vector });
console.log('\nTable schema fields:', table.schema.fields.map(f => ({ name: f.name, metadata: f.metadata })));

// Test 4: Serialized and check what's in the buffer
const ipcBuffer = arrow.tableToIPC(table, 'stream');
console.log('\nSerialized to', ipcBuffer.length, 'bytes');

// Test 5: Deserialize and check
const deserialized = arrow.tableFromIPC(ipcBuffer);
console.log('Deserialized schema fields:', deserialized.schema.fields.map(f => ({ name: f.name, metadata: f.metadata })));
