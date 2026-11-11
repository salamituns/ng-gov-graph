import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runRefresh } from './lab-refresh'
import { reason } from './refresh-reason'

const env = { REVALIDATE_HOST:'pods.test',CRON_SECRET:'cron',CF_ZONE_ID:'zone',CF_API_TOKEN:'cf' }
test('refresh validates configuration before persistence and rejects empty DNS answers without purging',async()=>{
  let persisted = false, called = false
  const deps = { persist:async()=>{persisted=true},resolve4:async()=>[],fetch:(async()=>{called=true;return Response.json({success:true})}) as typeof fetch,log:()=>{} }
  await assert.rejects(runRefresh({...env,REVALIDATE_PORT:'0'},deps),/REVALIDATE_PORT/)
  assert.equal(persisted,false)
  await assert.rejects(runRefresh(env,deps),/no valid A records/)
  assert.equal(persisted,true);assert.equal(called,false)
})
test('a malformed pod acknowledgement skips purge even when HTTP is 200',async()=>{
  const calls:string[]=[]
  await assert.rejects(runRefresh(env,{persist:async()=>{},resolve4:async()=>['127.0.0.1','127.0.0.2'],log:()=>{},fetch:(async(url)=>{calls.push(String(url));return Response.json({ok:false})}) as typeof fetch}),/2\/2 pod/)
  assert.equal(calls.length,2);assert(calls.every(url=>url.endsWith('/api/revalidate')))
})
test('refresh reasons redact credentials and keep messages short',()=>{
  const before = process.env.CF_API_TOKEN
  process.env.CF_API_TOKEN='private-test-token'
  try {
    const message=reason(new Error('private-test-token postgres://user:pass@host/db Bearer token '+ 'x'.repeat(500)))
    assert(!message.includes('private-test-token'));assert(!message.includes('user:pass'));assert(!message.includes('Bearer token'));assert(message.length<=300)
  } finally { if(before===undefined) delete process.env.CF_API_TOKEN;else process.env.CF_API_TOKEN=before }
})
