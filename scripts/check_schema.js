const supabaseUrl = 'https://alhwuoozlzmrgttupctt.supabase.co'
const supabaseKey = 'sb_publishable_dQYHQlnm9-zmTE-DCxVe5Q_kNyYo0fu'

async function check() {
  const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`)
  const data = await res.json()
  console.log(Object.keys(data.components ? data.components.schemas : data))
  if (data.definitions) console.log('Has definitions')
}

check()
