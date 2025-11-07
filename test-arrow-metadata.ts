import * as arrow from 'apache-arrow';

const vector = arrow.vectorFromArray([1, 2, 3, 4, 5, 6], new arrow.Float64());
const table1 = new arrow.Table({ test: vector });

// Manually add metadata to the field
const field = table1.schema.fields[0];
const metaMap = new Map([['shape', '[1, 2, 3]'], ['dtype', 'float64']]);
const fieldWithMeta = new arrow.Field(field.name, field.type, field.nullable, metaMap);
const schemaWithMeta = new arrow.Schema([fieldWithMeta], table1.schema.metadata);
const tableWithMeta = new arrow.Table(schemaWithMeta, table1.batches);

console.log('BEFORE: Field metadata =', tableWithMeta.schema.fields[0]?.metadata ? Object.fromEntries(tableWithMeta.schema.fields[0].metadata) : 'NONE');

const ipcBuffer = arrow.tableToIPC(tableWithMeta, 'stream');
console.log('Serialized:', ipcBuffer.length, 'bytes\n');

const table2 = arrow.tableFromIPC(ipcBuffer);
const meta2 = table2.schema.fields[0]?.metadata;

console.log('AFTER: Field metadata =', meta2 ? Object.fromEntries(meta2) : 'NONE');
console.log('\nResult:', meta2 && meta2.has('shape') ? '✅ PRESERVED' : '❌ LOST');
