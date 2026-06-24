import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Or anon key if testing RLS, but here we test the query syntax

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuery() {
  const { data, error } = await supabase
    .from('students')
    .select('id, class_id, student_classes(classes:class_id(id))')
    .limit(5)
    
  console.log("Error:", error)
  console.log("Data:", JSON.stringify(data, null, 2))
}

testQuery()
