import {createClient} from 'https://esm.sh/@supabase/supabase-js@2'
import {renderInquiry,validateInquiry} from './contract.mjs'

const ALLOWED=new Set(['https://atlaseye.ai','https://www.atlaseye.ai','https://lab.atlaseye.ai'])
const json=(status:number,body:object,origin:string)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Vary':'Origin','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}})
const digest=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))).map(x=>x.toString(16).padStart(2,'0')).join('')

export default {async fetch(req:Request){
  const started=performance.now(),origin=req.headers.get('Origin')||''
  let status=400,result='rejected',reference=crypto.randomUUID()
  try{
    if(!ALLOWED.has(origin))return json(403,{error:'request_rejected'},'null')
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type, x-atlas-request-id','Access-Control-Max-Age':'600','Vary':'Origin'}})
    if(req.method!=='POST')return json(405,{error:'request_rejected'},origin)
    if(req.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()!=='application/json')return json(415,{error:'request_rejected'},origin)
    const length=Number(req.headers.get('Content-Length')||'0')
    if(!Number.isFinite(length)||length<=0||length>4096)return json(413,{error:'request_rejected'},origin)
    const raw=await req.text()
    if(new TextEncoder().encode(raw).length>4096)return json(413,{error:'request_rejected'},origin)
    const value=validateInquiry(JSON.parse(raw))
    if(req.headers.get('X-Atlas-Request-Id')!==value.request_id)return json(400,{error:'request_rejected'},origin)
    const secret=Deno.env.get('INQUIRY_RATE_SECRET'),url=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),resend=Deno.env.get('RESEND_API_KEY'),notify=Deno.env.get('NOTIFY_EMAIL')
    if(!secret||!url||!service||!resend||!notify)throw Error('configuration')
    const client=req.headers.get('CF-Connecting-IP')||req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown'
    const requestHash=await digest(secret+'|request|'+value.request_id),clientHash=await digest(secret+'|client|'+client)
    const db=createClient(url,service,{auth:{persistSession:false}})
    const {data,error}=await db.rpc('reserve_atlas_inquiry',{p_request_hash:requestHash,p_client_hash:clientHash,p_correlation_id:reference})
    if(error||!Array.isArray(data)||!data[0])throw Error('guard')
    reference=data[0].reference
    if(!data[0].accepted&&!data[0].duplicate){status=429;result='rate_limited';return json(429,{error:'request_rejected'},origin)}
    const message=renderInquiry(value)
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resend}`,'Content-Type':'application/json','Idempotency-Key':'atlas-readiness/'+value.request_id},body:JSON.stringify({from:'Atlas Nuclear <notify@atlaseye.ai>',to:[notify],subject:message.subject,html:message.html,text:message.text})})
    if(!response.ok)throw Error('delivery')
    status=200;result=data[0].duplicate?'duplicate':'delivered'
    return json(200,{ok:true,reference},origin)
  }catch{status=503;result='failed';return json(503,{error:'request_unavailable'},ALLOWED.has(origin)?origin:'null')}
  finally{console.log(JSON.stringify({event:'atlas_inquiry',status,result,reference,duration_ms:Math.round(performance.now()-started)}))}
}}
