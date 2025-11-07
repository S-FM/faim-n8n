import * as arrow from 'apache-arrow';

// Create fields WITH metadata exactly like our serializer
const fields = [
  new arrow.Field('x', new arrow.Float64(), true, new Map([
    ['shape', '[1,12,1]'],
    ['dtype', 'float64']
  ]))
];

// Create vectors
const vector = arrow.vectorFromArray([10, 12, 14, 13, 15, 17, 16, 18, 20, 19, 21, 22], new arrow.Float64());

// Create schema with field metadata + schema metadata
const schemaMetadata = new Map([['user_meta', '{"horizon":7}']]);
const schema = new arrow.Schema(fields, schemaMetadata);

// Create table from column dict THEN wrap with our schema
const columnDict = { x: vector };
const tempTable = new arrow.Table(columnDict);

console.log('Step 1 - Temp table field metadata:', tempTable.schema.fields[0]?.metadata?.size || 'NONE');

// Try to reconstruct with schema that has metadata
console.log('\nStep 2 - Trying to wrap with metadata schema...');
try {
  const finalTable = new arrow.Table(schema, tempTable.batches);
  console.log('✅ Table created successfully');
  
  // Serialize
  const ipcBuffer = arrow.tableToIPC(finalTable, 'stream');
  console.log('Serialized:', ipcBuffer.length, 'bytes');
  
  // Deserialize
  const deserialized = arrow.tableFromIPC(ipcBuffer);
  const meta = deserialized.schema.fields[0]?.metadata;
  
  console.log('\nStep 3 - After round-trip:');
  console.log('Field metadata:', meta ? Object.fromEntries(meta) : 'NONE');
  
  if (meta && meta.has('shape')) {
    console.log('✅ METADATA PRESERVED - Shape will be reshaped by backend');
  } else {
    console.log('❌ METADATA LOST - Backend will receive (12,) not (1,12,1)');
  }
} catch (e) {
  console.log('❌ Failed:', (e as Error).message);
  console.log('\nFallback: Use inferred table with metadata');
  
  const updatedSchema = new arrow.Schema(tempTable.schema.fields, schemaMetadata);
  const fallbackTable = new arrow.Table(updatedSchema, tempTable.batches);
  const ipcBuffer = arrow.tableToIPC(fallbackTable, 'stream');
  
  const deserialized = arrow.tableFromIPC(ipcBuffer);
  const meta = deserialized.schema.fields[0]?.metadata;
  
  console.log('Fallback field metadata:', meta ? Object.fromEntries(meta) : 'NONE');
  console.log('Result: Backend receives (12,) not (1,12,1) ❌');
}
