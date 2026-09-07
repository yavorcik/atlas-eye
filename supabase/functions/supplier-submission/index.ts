import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHandler } from './handler.mjs'

const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(byte => byte.toString(16).padStart(2, '0')).join('')
const handler = createHandler({
  previewOrigin: Deno.env.get('SUPPLIER_PREVIEW_ORIGIN') || '',
  async save(value: Record<string, unknown>) {
    const url = Deno.env.get('SUPABASE_URL')
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const secret = Deno.env.get('SUPPLIER_RATE_SECRET')
    if (!url || !service || !secret) throw Error('configuration')
    const db = createClient(url, service, { auth: { persistSession: false } })
    const { data, error } = await db.rpc('submit_atlas_supplier', {
      p_request_hash: await digest(`${secret}|request|${value.request_id}`),
      p_email_hash: await digest(`${secret}|email|${value.email}`),
      p_payload_hash: await digest(JSON.stringify(value)),
      p_payload: value,
    })
    if (error || !Array.isArray(data) || !data[0]) throw Error('storage')
    return data[0]
  },
})

export default { fetch: handler }
