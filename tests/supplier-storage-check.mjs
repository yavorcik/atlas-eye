// Use an isolated PGlite install; this validation does not add a website dependency.
import { env } from 'node:process'
if (!env.PGLITE_MODULE) throw Error('Set PGLITE_MODULE to the file URL of an installed @electric-sql/pglite dist/index.js')
const { PGlite } = await import(env.PGLITE_MODULE)
import fs from 'node:fs'
import assert from 'node:assert/strict'
const db = new PGlite()
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
await db.exec(fs.readFileSync(new URL('../supabase/migrations/202609070001_supplier_submissions.sql', import.meta.url), 'utf8'))
for (const role of ['anon','authenticated']) {
 await db.exec(`set role ${role}`)
 for (const table of ['atlas_supplier_submissions','atlas_supplier_review_events']) await assert.rejects(db.query(`select * from public.${table}`),/permission denied/)
 await assert.rejects(db.query("select * from public.submit_atlas_supplier($1,$2,$3,$4)",['a'.repeat(64),'b'.repeat(64),'c'.repeat(64),{}]),/permission denied/)
 await db.exec('reset role')
}
await db.exec('set role service_role')
const submit=async(n,email=1,payloadHash='c'.repeat(64))=>(await db.query('select * from public.submit_atlas_supplier($1,$2,$3,$4)',[n.toString(16).padStart(64,'0'),email.toString(16).padStart(64,'0'),payloadHash,{email:'private@example.com'}])).rows[0]
const first=await submit(1);assert.equal(first.outcome,'created')
const retry=await submit(1);assert.equal(retry.outcome,'duplicate');assert.equal(first.reference,retry.reference)
assert.equal((await submit(1,1,'d'.repeat(64))).outcome,'conflict')
for(let n=2;n<=5;n++)assert.equal((await submit(n)).outcome,'created')
assert.equal((await submit(6)).outcome,'limited')
for(let n=6;n<=100;n++)assert.equal((await submit(n,n)).outcome,'created')
assert.equal((await submit(101,101)).outcome,'limited')
assert.equal((await db.query('select count(*)::integer as n from public.atlas_supplier_submissions')).rows[0].n,100)
assert.equal((await db.query("select count(*)::integer as n from public.atlas_supplier_submissions where status='pending'")).rows[0].n,100)
console.log('PASS: actual PostgreSQL migration; anonymous/authenticated access denied; service-only intake; private pending rows; retry receipts; payload conflicts; email and global rate limits.')
await db.close()
