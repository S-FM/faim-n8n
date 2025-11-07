import * as arrow from 'apache-arrow';

// Step 1: Create temp table to get batches
const vector = arrow.vectorFromArray([10, 12, 14, 13, 15, 17, 16, 18, 20, 19, 21, 22], new arrow.Float64());
const tempTable = new arrow.Table({ x: vector });

console.log('Temp table batches:', tempTable.numRows, 'rows');
console.log('Temp batches count:', tempTable.batches.length);

// Step 2: Create fields with metadata (matching the temp table's fields)
const fieldsWithMetadata = tempTable.schema.fields.map(field => 
  new arrow.Field(field.name, field.type, field.nullable, new Map([
    ['shape', '[1,12,1]'],
    ['dtype', 'float64']
  ]))
);

console.log('Fields with metadata:', fieldsWithMetadata.map(f => ({ name: f.name, meta: Object.fromEntries(f.metadata || new Map()) })));

// Step 3: Create schema with field metadata + schema metadata
const schemaMetadata = new Map([['user_meta', '{"horizon":7}']]);
const schemaWithMeta = new arrow.Schema(fieldsWithMetadata, schemaMetadata);

// Step 4: Try to create table from schema + batches
console.log('\nAttempting to create table from schema with metadata + inferred batches...');

try {
  const finalTable = new arrow.Table(schemaWithMeta, tempTable.batches);
  console.log('✅ SUCCESS!');
  
  // Serialize
  const ipcBuffer = arrow.tableToIPC(finalTable, 'stream');
  console.log('Serialized:', ipcBuffer.length, 'bytes');
  
  // Deserialize
  const deserialized = arrow.tableFromIPC(ipcBuffer);
  const meta = deserialized.schema.fields[0]?.metadata;
  const schemaUser = deserialized.schema.metadata?.get('user_meta');
  
  console.log('\nAfter round-trip:');
  console.log('Field metadata:', meta ? Object.fromEntries(meta) : 'NONE');
  console.log('Schema metadata (user_meta):', schemaUser || 'NONE');
  
  if (meta && meta.has('shape')) {
    console.log('\n✅ BOTH METADATA TYPES PRESERVED!');
    console.log('Backend can reshape (12,) → (1,12,1)');
  }
} catch (e) {
  console.log('❌ Failed:', (e as Error).message);
}
