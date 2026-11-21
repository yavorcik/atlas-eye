import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {runInNewContext} from 'node:vm'
const script=readFileSync(new URL('../public/rule-impact/metrics.js',import.meta.url),'utf8')

function run(search, privacy={}){
  const requests=[]
  const window={}
  const context={location:{search,hostname:'atlaseye.ai'},navigator:privacy,window,URLSearchParams,Date,crypto:{randomUUID:()=> '06fac160-4399-4a21-b4e4-00ed5c91d98e'},fetch:async (url,options)=>{requests.push({url,options});return {ok:true}}}
  runInNewContext(script,context)
  return {requests,report:window.atlasRuleImpactMetric}
}
test('only allowlisted metrics and attribution, without credentials or identifying data', () => {
  const {requests,report}=run('?utm_source=linkedin&utm_campaign=launch&email=test@example.invalid')
  report('start');report('start');report('complete');report('complete');report('contact')
  const payloads=requests.map(x=>JSON.parse(x.options.body))
  assert.deepEqual(payloads.map(x=>x.path), ['/rule-impact/view/linkedin/','/rule-impact/start/linkedin/','/rule-impact/complete/linkedin/'])
  assert.deepEqual(payloads.map(x=>x.event_type), ['page_view','click','click'])
  for(const x of payloads) assert.deepEqual(Object.keys(x).sort(),['event_id','event_type','occurred_at','path','site'])
  for(const {options} of requests){assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer')}
})
test('unknown sources are grouped; privacy signals suppress all collection',()=>{
  const {requests}=run('?utm_source=some-person')
  assert.match(requests[0].options.body,/\/rule-impact\/view\/other\//)
  for(const privacy of [{doNotTrack:'1'},{globalPrivacyControl:true}]){
    const {requests,report}=run('?utm_source=facebook',privacy)
    report('start');report('complete');assert.equal(requests.length,0)
  }
})
