import { supabase } from './src/supabaseClient.js'

async function checkTables() {
  const { data: refunds, error: e1 } = await supabase.from('refund_requests').select('*').limit(1)
  console.log('refund_requests:', e1 ? e1.message : 'EXISTS')
  
  const { data: notifs, error: e2 } = await supabase.from('notifications').select('*').limit(1)
  console.log('notifications:', e2 ? e2.message : 'EXISTS')
}

checkTables()
