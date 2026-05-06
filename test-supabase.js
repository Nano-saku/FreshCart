require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase.from('stores').select('*');
  console.log('Stores Error:', error);
  console.log('Stores Data:', data);
  
  const { data: pData, error: pError } = await supabase.from('store_products').select('*, product:products(*), store:stores(name)');
  console.log('Products Error:', pError);
  console.log('Products Data:', pData?.length);
}

test();
