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
  for(const invalid of ['-1','1.5','2147483648','']) await assert.rejects(runRefresh({...env,REVALIDATE_SETTLE_MS:invalid},deps),/REVALIDATE_SETTLE_MS/)
  for(const name of ['REVALIDATE_ROUND_RETRIES','REVALIDATE_RETRY_MS']) for(const invalid of ['-1','1.5','2147483648','']) await assert.rejects(runRefresh({...env,[name]:invalid},deps),new RegExp(name))
  await assert.rejects(runRefresh({...env,REFRESH_PURGE:'yes'},deps),/REFRESH_PURGE/)
  assert.equal(persisted,false)
  await assert.rejects(runRefresh(env,deps),/no valid A records/)
  assert.equal(persisted,true);assert.equal(called,false)
})
test('a malformed pod acknowledgement skips purge even when HTTP is 200',async()=>{
  const calls:string[]=[]
  await assert.rejects(runRefresh({...env,REVALIDATE_ROUND_RETRIES:'0'},{persist:async()=>{},resolve4:async()=>['127.0.0.1','127.0.0.2'],log:()=>{},fetch:(async(url)=>{calls.push(String(url));return Response.json({ok:false})}) as typeof fetch}),/2\/2 pod/)
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
test('two pod rounds bracket the settle delay before one purge and warmup',async()=>{
  const events:string[]=[]
  let waited=0
  await runRefresh(env,{
    persist:async()=>{events.push('persist')},resolve4:async()=>['127.0.0.1','127.0.0.2'],log:()=>{},
    sleep:async(ms:number)=>{waited=ms;events.push('settle')},
    fetch:(async(url,options)=>{
      const u=new URL(String(url))
      if(options?.method==='POST'&&u.pathname==='/api/revalidate'){events.push(`pod:${u.hostname}`);return Response.json({ok:true})}
      if(u.pathname.endsWith('/purge_cache')){events.push('purge');return Response.json({success:true})}
      events.push(`warm:${u.hostname}:${u.pathname}`)
      return u.pathname==='/ng'?new Response('<link href="/api/graph/0123456789abcdef">'):Response.json({graph:{}})
    }) as typeof fetch,
  })
  assert.equal(waited,10000)
  assert.deepEqual(events.slice(0,7),['persist','pod:127.0.0.1','pod:127.0.0.2','settle','pod:127.0.0.1','pod:127.0.0.2','purge'])
  assert.equal(events.filter(event=>event==='purge').length,1)
  assert.equal(events.filter(event=>event.startsWith('warm:')).length,4)
})
test('warm-up failures are logged with reasons and do not fail the refresh',async()=>{
  const logs:string[]=[];let purges=0;const warmed:string[]=[]
  await runRefresh(env,{
    persist:async()=>{},resolve4:async()=>['127.0.0.1','127.0.0.2','127.0.0.3'],log:(m:string)=>{logs.push(m)},sleep:async()=>{},
    fetch:(async(url,options)=>{
      const u=new URL(String(url))
      if(options?.method==='POST'&&u.pathname==='/api/revalidate')return Response.json({ok:true})
      if(u.pathname.endsWith('/purge_cache')){purges++;return Response.json({success:true})}
      if(u.hostname==='127.0.0.2'&&u.pathname==='/ng')return new Response('down',{status:500})
      if(u.hostname==='127.0.0.3'&&u.pathname==='/ng')return new Response('<html>no graph link</html>')
      warmed.push(`${u.hostname}${u.pathname}`)
      return u.pathname==='/ng'?new Response('<link href="/api/graph/0123456789abcdef">'):Response.json({graph:{}})
    }) as typeof fetch,
  })
  assert.equal(purges,1)
  assert.deepEqual(warmed.sort(),['127.0.0.1/api/graph/0123456789abcdef','127.0.0.1/ng'])
  const warning=logs.find(m=>m.startsWith('warning:'))
  assert(warning,'expected a warm-up warning')
  assert.match(warning,/2\/3 pod warmups failed/)
  assert.match(warning,/127\.0\.0\.2: homepage warmup failed \(500\)/)
  assert.match(warning,/127\.0\.0\.3: homepage warmup has no versioned graph URL/)
})
test('a pod that fails a try then leaves DNS lets the retry succeed with one purge',async()=>{
  const logs:string[]=[],pods:string[]=[],warms:string[]=[];let resolves=0,purges=0
  const sleeps:number[]=[]
  const resolve4=async()=>{const ips=resolves===2?['127.0.0.1']:['127.0.0.1','127.0.0.2'];resolves++;return ips}
  let bRefused=0
  await runRefresh({...env,REVALIDATE_SETTLE_MS:'1',REVALIDATE_ROUND_RETRIES:'3',REVALIDATE_RETRY_MS:'7'},{
    persist:async()=>{},resolve4,log:(m:string)=>{logs.push(m)},sleep:async(ms:number)=>{sleeps.push(ms)},
    fetch:(async(url,options)=>{
      const u=new URL(String(url))
      if(options?.method==='POST'&&u.pathname==='/api/revalidate'){
        if(u.hostname==='127.0.0.2'&&++bRefused===2)throw new Error('connect ECONNREFUSED 127.0.0.2:3000')
        pods.push(u.hostname);return Response.json({ok:true})
      }
      if(u.pathname.endsWith('/purge_cache')){purges++;return Response.json({success:true})}
      warms.push(`${u.hostname}${u.pathname}`)
      return u.pathname==='/ng'?new Response('<link href="/api/graph/0123456789abcdef">'):Response.json({graph:{}})
    }) as typeof fetch,
  })
  assert.equal(resolves,3,'DNS is re-resolved per round and per retry')
  assert.deepEqual(sleeps,[1,7],'the settle delay then the retry wait, no real sleeping')
  assert.deepEqual(pods,['127.0.0.1','127.0.0.2','127.0.0.1','127.0.0.1'])
  assert.equal(purges,1)
  assert.deepEqual(warms,['127.0.0.1/ng','127.0.0.1/api/graph/0123456789abcdef'],'warm-up uses the final round-two addresses')
  const retryLog=logs.find(m=>m.includes('retrying'))
  assert(retryLog,'expected a retry log line')
  assert.match(retryLog,/1\/2 pod revalidations failed/)
  assert.match(retryLog,/127\.0\.0\.2: connect ECONNREFUSED/)
  assert.match(retryLog,/retrying in 7 ms/)
})
test('a pod that keeps failing exhausts retries with no purge',async()=>{
  const sleeps:number[]=[];let resolves=0,purges=0
  await assert.rejects(runRefresh({...env,REVALIDATE_SETTLE_MS:'1',REVALIDATE_ROUND_RETRIES:'2',REVALIDATE_RETRY_MS:'5'},{
    persist:async()=>{},resolve4:async()=>{resolves++;return['127.0.0.1','127.0.0.2']},log:()=>{},sleep:async(ms:number)=>{sleeps.push(ms)},
    fetch:(async(url,options)=>{
      const u=new URL(String(url))
      if(options?.method==='POST'&&u.pathname==='/api/revalidate'){
        if(u.hostname==='127.0.0.2')return new Response('',{status:503})
        return Response.json({ok:true})
      }
      purges++;return Response.json({success:true})
    }) as typeof fetch,
  }),/1\/2 pod revalidations failed; purge skipped/)
  assert.equal(resolves,3,'one resolve per try including the retries')
  assert.deepEqual(sleeps,[5,5])
  assert.equal(purges,0)
})
test('REFRESH_PURGE=skip never calls Cloudflare, needs no CF secrets and still warms',async()=>{
  const logs:string[]=[],warms:string[]=[];let purges=0
  await runRefresh({REVALIDATE_HOST:'pods.test',CRON_SECRET:'cron',REFRESH_PURGE:'skip',REVALIDATE_SETTLE_MS:'1'},{
    persist:async()=>{},resolve4:async()=>['127.0.0.1'],log:(m:string)=>{logs.push(m)},sleep:async()=>{},
    fetch:(async(url,options)=>{
      const u=new URL(String(url))
      if(options?.method==='POST'&&u.pathname==='/api/revalidate')return Response.json({ok:true})
      if(u.pathname.endsWith('/purge_cache')){purges++;return Response.json({success:true})}
      warms.push(u.pathname)
      return u.pathname==='/ng'?new Response('<link href="/api/graph/0123456789abcdef">'):Response.json({graph:{}})
    }) as typeof fetch,
  })
  assert.equal(purges,0)
  assert(logs.includes('purge skipped (REFRESH_PURGE=skip)'))
  assert.deepEqual(warms,['/ng','/api/graph/0123456789abcdef'])
})
test('DNS failures inside a round are retried, then succeed',async()=>{
  let calls=0;let purges=0;const logs:string[]=[]
  await runRefresh(env,{
    persist:async()=>{},log:(m:string)=>{logs.push(m)},sleep:async()=>{},
    resolve4:async()=>{calls++;if(calls===2)throw Object.assign(new Error('queryA ESERVFAIL web-headless'),{code:'ESERVFAIL'});if(calls===3)return[];return['127.0.0.1']},
    fetch:(async(url,options)=>{
      const u=new URL(String(url))
      if(options?.method==='POST'&&u.pathname==='/api/revalidate')return Response.json({ok:true})
      if(u.pathname.endsWith('/purge_cache')){purges++;return Response.json({success:true})}
      return u.pathname==='/ng'?new Response('<link href="/api/graph/0123456789abcdef">'):Response.json({graph:{}})
    }) as typeof fetch,
  })
  assert.equal(purges,1);assert.equal(calls,4)
  assert.equal(logs.filter(m=>m.includes('resolve failed')).length,2)
})
test('persistent DNS failure exhausts retries without purging',async()=>{
  let purges=0
  await assert.rejects(runRefresh({...env,REVALIDATE_ROUND_RETRIES:'1'},{
    persist:async()=>{},log:()=>{},sleep:async()=>{},resolve4:async()=>{throw new Error('queryA ENOTFOUND web-headless')},
    fetch:(async(url)=>{if(String(url).includes('purge_cache'))purges++;return Response.json({ok:true,success:true})}) as typeof fetch,
  }),/round 1: .*ENOTFOUND.*purge skipped/)
  assert.equal(purges,0)
})
test('REVALIDATE_ROUND_RETRIES above 10 is rejected',async()=>{
  await assert.rejects(runRefresh({...env,REVALIDATE_ROUND_RETRIES:'11'},{persist:async()=>{},log:()=>{}}),/REVALIDATE_ROUND_RETRIES is invalid/)
})
