import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY
const writePin = import.meta.env.VITE_WRITE_PIN
export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: writePin ? { 'x-write-pin': writePin } : {}
  }
})
