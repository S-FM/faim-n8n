import * as arrow from 'apache-arrow';

const vector = arrow.vectorFromArray([10, 12, 14], new arrow.Float64());
const fieldWithMeta = new arrow.Field('x', new arrow.Float64(), true, new Map([['shape', '[1,3]']]));

const tempTable = new arrow.Table({ x: vector });
const tempField = tempTable.schema.fields[0];

console.log('Our field:', { type: fieldWithMeta.type.toString(), nullable: fieldWithMeta.nullable });
console.log('Temp field:', { type: tempField.type.toString(), nullable: tempField.nullable });

const schema = new arrow.Schema([fieldWithMeta]);
try {
  new arrow.Table(schema, tempTable.batches);
  console.log('✅ SUCCESS');
} catch (e) {
  console.log('❌ FAILED:', (e as Error).message);
  
  // Try with temp field + metadata
  const tempFieldWithMeta = new arrow.Field(tempField.name, tempField.type, tempField.nullable, new Map([['shape', '[1,3]']]));
  const schema2 = new arrow.Schema([tempFieldWithMeta]);
  try {
    new arrow.Table(schema2, tempTable.batches);
    console.log('✅ SUCCESS with temp field + metadata');
  } catch (e2) {
    console.log('❌ STILL FAILED:', (e2 as Error).message);
  }
}
