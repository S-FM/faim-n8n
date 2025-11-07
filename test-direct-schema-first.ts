import * as arrow from 'apache-arrow';

// Approach: Create schema with metadata FIRST
const fields = [
  new arrow.Field('x', new arrow.Float64(), true, new Map([
    ['shape', '[1,12,1]'],
    ['dtype', 'float64']
  ]))
];

const schemaMetadata = new Map([['user_meta', '{"horizon":7}']]);
const schema = new arrow.Schema(fields, schemaMetadata);

// Create vector
const vector = arrow.vectorFromArray([10, 12, 14, 13, 15, 17, 16, 18, 20, 19, 21, 22], new arrow.Float64());

// Create table directly - pass schema AND column dict
// Check if Table constructor accepts (schema, columnDict)
console.log('Trying: new arrow.Table(schema, { x: vector })');

try {
  const table = new arrow.Table(schema, { x: vector });
  console.log('✅ Table created directly with schema + vectors!');
  
  const ipcBuffer = arrow.tableToIPC(table, 'stream');
  console.log('Serialized:', ipcBuffer.length, 'bytes');
  
  const deserialized = arrow.tableFromIPC(ipcBuffer);
  const meta = deserialized.schema.fields[0]?.metadata;
  
  console.log('Field metadata after round-trip:', meta ? Object.fromEntries(meta) : 'NONE');
  
  if (meta && meta.has('shape')) {
    console.log('✅ FIELD METADATA PRESERVED!');
  } else {
    console.log('❌ Field metadata lost');
  }
} catch (e) {
  console.log('❌ Direct construction failed:', (e as Error).message);
}
