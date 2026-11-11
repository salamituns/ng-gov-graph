// Exercise the shipped CLI with boundary stubs and no filesystem write permission, including /tmp.
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {once} from 'node:events'
import {mkdtemp,cp,writeFile,rm,readdir,chmod,mkdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {spawn} from 'node:child_process'

const temp=await mkdtemp(join(tmpdir(),'govgraph-refresh-')),job=join(temp,'job'),actual=join(temp,'actual')
const servers=[],events=[],rounds=[0,0],times=[[],[]]
const settleMs=40
let failRound=0,failCf=false,failWarm=false
async function modes(dir,writable) {
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const file=join(dir,entry.name)
    if(entry.isDirectory())await modes(file,writable)
    await chmod(file,writable?(entry.isDirectory()?0o755:0o644):(entry.isDirectory()?0o555:0o444))
  }
  await chmod(dir,writable?0o755:0o555)
}
async function listen(handler) {
  const server=createServer(handler);servers.push(server)
  server.listen(0,'127.0.0.1');await once(server,'listening');return server.address().port
}
try {
  const podPorts=await Promise.all([0,1].map(id=>listen(async(req,res)=>{
    res.setHeader('Content-Type','application/json')
    if(req.method==='POST') {
      assert.equal(req.url,'/api/revalidate');assert.equal(req.headers.authorization,'Bearer test-cron')
      const round=++rounds[id];times[id].push(performance.now());events.push(`pod${id}:round${round}`)
      const failed=id===1&&round===failRound
      res.writeHead(failed?503:200);res.end(JSON.stringify({ok:!failed}));return
    }
    assert.equal(req.method,'GET');assert(events.includes('purge'),'Warmup must follow the purge')
    if(req.url==='/ng') {
      events.push(`warm${id}:home`);res.writeHead(failWarm&&id===1?500:200,{'Content-Type':'text/html'})
      res.end('<link rel="preload" href="/api/graph/0123456789abcdef">');return
    }
    assert.equal(req.url,'/api/graph/0123456789abcdef');events.push(`warm${id}:graph`);res.end('{"graph":{}}')
  })))
  assert.notEqual(podPorts[0],podPorts[1])
  const cfPort=await listen(async(req,res)=>{
    assert.equal(req.method,'POST');assert.equal(req.url,'/client/v4/zones/test-zone/purge_cache')
    assert.equal(req.headers.authorization,'Bearer test-cf')
    let body='';for await(const chunk of req)body+=chunk
    assert.deepEqual(JSON.parse(body),{purge_everything:true});assert.deepEqual(rounds,[2,2])
    for(const time of times)assert(time[1]-time[0]>=settleMs-5,'Configured settle delay was skipped')
    events.push('purge');res.writeHead(failCf?500:200,{'Content-Type':'application/json'});res.end(JSON.stringify({success:!failCf}))
  })
  for(const directory of [job,actual]) {
    await mkdir(directory)
    await cp(resolve('build/refresh.mjs'),join(directory,'refresh.mjs'))
  }
  await writeFile(join(job,'refresh-persist.mjs'),`export async function persist(){if(process.env.TEST_FAIL_PERSIST)throw new Error('stub persistence failure')}`)
  await cp(resolve('build/refresh-persist.mjs'),join(actual,'refresh-persist.mjs'))
  const guard=`import assert from 'node:assert/strict';import fs from 'node:fs';assert.equal(process.permission.has('fs.write'),false);for(const p of [process.cwd()+'/.next/cache/probe','/tmp/govgraph-r4-denied'])assert.throws(()=>fs.writeFileSync(p,'denied'),{code:'ERR_ACCESS_DENIED'});`
  await writeFile(join(job,'preload.mjs'),guard+`import dns from 'node:dns';dns.promises.resolve4=async(host)=>{assert.equal(host,'pods.test');return ['127.0.0.10','127.0.0.11','127.0.0.10']};
    const original=globalThis.fetch;globalThis.fetch=(url,options)=>{const u=new URL(url);const ports=${JSON.stringify(podPorts)};const index=['127.0.0.10','127.0.0.11'].indexOf(u.hostname);if(index>=0){assert.equal(u.port,'3000');u.hostname='127.0.0.1';u.port=String(ports[index])}return original(u,options)};`)
  await writeFile(join(actual,'preload.mjs'),guard+`globalThis.fetch=async(url)=>String(url).startsWith('https://nass.gov.ng/mps/get_legislators/')?Response.json({data:[]}):new Response('',{status:503});`)
  await modes(job,false);await modes(actual,false)
  async function run(extra={},directory=job) {
    events.length=0;rounds.fill(0);for(const time of times)time.length=0
    const child=spawn(process.execPath,['--permission','--allow-fs-read=*','--import',join(directory,'preload.mjs'),'refresh.mjs'],{
      cwd:directory,env:{PATH:process.env.PATH,NODE_ENV:'production',REVALIDATE_HOST:'pods.test',REVALIDATE_PORT:'3000',REVALIDATE_SETTLE_MS:String(settleMs),CRON_SECRET:'test-cron',CF_ZONE_ID:'test-zone',CF_API_TOKEN:'test-cf',CF_API_BASE:`http://127.0.0.1:${cfPort}/client/v4/`,...extra},stdio:['ignore','pipe','pipe'],
    })
    let output='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>output+=data)
    const [code]=await once(child,'exit')
    assert(output.length<1500,output);assert(!output.includes('test-cron')&&!output.includes('test-cf'))
    return {code,output}
  }
  let result=await run();assert.equal(result.code,0,result.output)
  assert.deepEqual(events.slice(0,4).sort(),['pod0:round1','pod0:round2','pod1:round1','pod1:round2'])
  assert.equal(events[4],'purge');assert.equal(events.filter(event=>event==='purge').length,1)
  assert.deepEqual(events.slice(5).sort(),['warm0:graph','warm0:home','warm1:graph','warm1:home'])
  for(const round of [1,2]) {
    failRound=round;result=await run();assert.notEqual(result.code,0)
    assert.match(result.output,new RegExp(`round ${round}: 1/2 pod revalidations failed; purge skipped`))
    assert(!events.includes('purge'));assert(events.every(event=>event.startsWith('pod')))
    assert.deepEqual(rounds,[round,round],'All pods in the failed round must still be attempted')
  }
  failRound=0
  assert.notEqual((await run({TEST_FAIL_PERSIST:'1'})).code,0);assert.deepEqual(events,[])
  failCf=true;assert.notEqual((await run()).code,0);assert.equal(events.at(-1),'purge');failCf=false
  failWarm=true;result=await run();assert.notEqual(result.code,0);assert.match(result.output,/warmups failed after purge/);failWarm=false
  // Real bundled persistence code is also loaded/exercised without writes. External fetches fail closed,
  // and an unreachable DB prevents production data mutation. Its expected failure is a DB connection error.
  result=await run({DATABASE_URL:'postgres://unavailable@127.0.0.1:1/unavailable'},actual)
  assert.notEqual(result.code,0);assert.match(result.output,/ECONNREFUSED/);assert(!result.output.includes('ERR_ACCESS_DENIED'));assert.deepEqual(events,[])
  assert(!(await readdir(job)).includes('.next'));assert(!(await readdir(actual)).includes('.next'))
  console.log('PASS: read-only refresh CLI, all filesystem writes denied including .next/cache and /tmp; two revalidation rounds per pod separated by settle delay precede one purge, then warmup; round-2 failure skips purge; actual persistence fails safely at unavailable DB without filesystem writes.')
} finally {
  await Promise.all(servers.map(server=>new Promise(done=>server.close(done))))
  await modes(temp,true);await rm(temp,{recursive:true,force:true})
}
