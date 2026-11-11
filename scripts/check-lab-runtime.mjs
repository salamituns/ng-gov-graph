// Run after LAB_BUILD=1 npm run build. Never logs dotenv values.
import assert from 'node:assert/strict'
import {cp,mkdtemp,readFile,readdir,chmod,rm,writeFile,stat} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {randomBytes,createHash} from 'node:crypto'
import {getRouteCacheKey} from 'next/dist/server/lib/route-cache-key.js'

try {process.loadEnvFile('.env.local')} catch(error) {if(error.code!=='ENOENT')throw error}
if(!process.env.DATABASE_URL)throw new Error('No local DATABASE_URL: runtime DB proof unavailable')
const temp=await mkdtemp(join(tmpdir(),'govgraph-readonly-')),app=join(temp,'app')
const writablePaths=['.next/cache','.next/server/route-cache']
let server
async function modes(dir,writable) {
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    if(entry.isSymbolicLink())continue
    const file=join(dir,entry.name)
    if(entry.isDirectory())await modes(file,writable)
    await chmod(file,writable?(entry.isDirectory()?0o755:0o644):(entry.isDirectory()?0o555:0o444))
  }
  await chmod(dir,writable?0o755:0o555)
}
function cachePath(pathname,sourceRoute,kind,suffix) {
  return join(app,'.next/server',getRouteCacheKey(pathname,{kind,sourceRoute}).slice(1)+suffix)
}
async function run(script,args=[],env={}) {
  const child=spawn(process.execPath,[resolve(script),...args],{env:{...process.env,...env},stdio:'inherit'})
  assert.equal((await once(child,'exit'))[0],0,script)
}
try {
  await cp('.next/standalone',app,{recursive:true})
  const config=JSON.parse(await readFile(join(app,'.next/required-server-files.json'),'utf8')).config
  assert.equal(config.cacheHandler,undefined)
  assert(!(await readdir(app)).some(file=>file.startsWith('.env')))
  const demo=await readFile('.next/server/app/api/graph.body')
  const demoDigest=createHash('sha256').update(demo).digest('hex').slice(0,16)
  for(const directory of writablePaths) {
    assert.equal((await readdir(join(app,directory))).length,0)
    await writeFile(join(app,directory,'old-process-entry'),'must be cleared')
  }
  await assert.rejects(readFile(join(app,'.next/server/app/ng.html')),{code:'ENOENT'})
  await assert.rejects(readFile(join(app,'.next/server/app/api/graph.body')),{code:'ENOENT'})
  const adapter=spawn(process.execPath,['--input-type=module','-e',`const {persist}=await import('./refresh-persist.mjs');const {default:assert}=await import('node:assert/strict');await assert.rejects(persist(),/DATABASE_URL is required/);`],{cwd:app,env:{...process.env,DATABASE_URL:''},stdio:'inherit'})
  assert.equal((await once(adapter,'exit'))[0],0)
  await modes(app,false)
  for(const directory of writablePaths)await modes(join(app,directory),true)
  // Fault injection at the default handler boundary tests the real endpoint's awaited queue.
  const preload=join(temp,'delay-tags.cjs')
  await writeFile(preload,`require(${JSON.stringify(join(app,'node_modules/next/dist/server/node-environment.js'))});const fs=require('node:fs/promises');const path=require('node:path');const Cache=require(${JSON.stringify(join(app,'node_modules/next/dist/server/lib/incremental-cache/file-system-cache.js'))}).default;const original=Cache.prototype.revalidateTag;Cache.prototype.revalidateTag=async function(...args){const root=path.join(process.cwd(),'.next/cache');try{await fs.access(path.join(root,'fail-tags'));throw new Error('injected handler failure')}catch(e){if(e.code!=='ENOENT')throw e}try{await fs.access(path.join(root,'hold-tags'));await fs.writeFile(path.join(root,'tags-blocked'),'yes');while(true){try{await fs.access(path.join(root,'hold-tags'))}catch{break}await new Promise(r=>setTimeout(r,20))}}catch(e){if(e.code!=='ENOENT')throw e}return original.apply(this,args)};`)
  const secret=randomBytes(24).toString('hex')
  const origin='http://127.0.0.1:3000'
  async function start() {
    server=spawn(process.execPath,['--require',preload,'start.mjs'],{cwd:app,env:{...process.env,HOSTNAME:'127.0.0.1',PORT:'3000',CRON_SECRET:secret,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','ignore','pipe']})
    let errors='';server.stderr.on('data',data=>errors+=data)
    let health
    for(let i=0;i<150;i++){try{health=await fetch(origin+'/healthz');break}catch{await new Promise(done=>setTimeout(done,100))}}
    assert(health,'Server did not start');assert.equal(health.status,200);assert.equal(await health.text(),'ok')
    for(const directory of writablePaths)assert.equal((await readdir(join(app,directory))).length,0,'Startup/probe must leave both caches empty')
    return ()=>errors
  }
  const errors=await start()
  const home=await fetch(origin+'/ng');assert.equal(home.status,200)
  const html=await home.text(),graphUrl=html.match(/\/api\/graph\/[a-f0-9]{16}/)?.[0];assert(graphUrl)
  const graphResponse=await fetch(origin+graphUrl);assert.equal(graphResponse.status,200)
  const data=await graphResponse.text(),resource=JSON.parse(data)
  assert.notEqual(graphUrl.split('/').at(-1),demoDigest,'First request must use runtime DB, not build catalog')
  assert.equal(createHash('sha256').update(data).digest('hex').slice(0,16),graphUrl.split('/').at(-1))
  assert.equal((await fetch(origin+'/ng/departments/ng-ministry-of-finance')).status,200)
  assert.equal((await fetch(origin+'/api/revalidate',{method:'POST'})).status,401)
  assert.equal((await fetch(origin+'/api/revalidate')).status,405)
  const homeFile=cachePath('/ng','/ng/page','APP_PAGE','.html')
  const before=(await stat(homeFile)).mtimeMs
  await writeFile(join(app,'.next/cache/hold-tags'),'hold')
  let acknowledged=false
  const pending=fetch(origin+'/api/revalidate',{method:'POST',headers:{Authorization:`Bearer ${secret}`}}).then(response=>{acknowledged=true;return response})
  for(let i=0;i<100;i++){try{await readFile(join(app,'.next/cache/tags-blocked'));break}catch{await new Promise(done=>setTimeout(done,20))}}
  assert.equal(await readFile(join(app,'.next/cache/tags-blocked'),'utf8'),'yes')
  assert.equal(acknowledged,false,'200 must await native tag invalidation')
  await rm(join(app,'.next/cache/hold-tags'))
  const invalidation=await pending;assert.equal(invalidation.status,200);assert.deepEqual(await invalidation.json(),{ok:true})
  const regenerated=await fetch(origin+'/ng');assert.equal(regenerated.status,200);await regenerated.text()
  assert((await stat(homeFile)).mtimeMs>before,'Next request after 200 must regenerate')
  assert.notEqual(regenerated.headers.get('x-nextjs-cache'),'HIT')
  await writeFile(join(app,'.next/cache/fail-tags'),'fail')
  assert.equal((await fetch(origin+'/api/revalidate',{method:'POST',headers:{Authorization:`Bearer ${secret}`}})).status,503)
  await rm(join(app,'.next/cache/fail-tags'))
  assert(!/EROFS|EACCES|Failed to update prerender cache/.test(errors()),'Unexpected write outside mounted paths')
  await run('scripts/check-page-cache.mjs',[origin])
  await run('scripts/check-regeneration-failure.mjs',[],{LAB_RUNTIME_ARTIFACT:app})
  const entityCount=new Set(Object.values(resource.graph.nodes).filter(node=>node.type!=='constituency').map(node=>node.id)).size
  const entityFile=cachePath('/ng/departments/ng-ministry-of-finance','/ng/[collection]/[slug]/page','APP_PAGE','.html')
  const sampledBytes=(await stat(entityFile)).size+(await stat(entityFile.replace(/\.html$/,'.rsc'))).size+(await stat(entityFile.replace(/\.html$/,'.meta'))).size
  console.log(JSON.stringify({entityCount,sampledEntityBytes:sampledBytes,conservativeRouteBytes:entityCount*256*1024},null,2))
  // Restart with stale files still on disk. The real entrypoint must remove both before readiness.
  server.kill('SIGTERM');await once(server,'exit')
  await start()
  assert.equal((await fetch(origin+'/ng')).status,200)
  console.log('PASS: default cache, node start.mjs clears both mounts on restart; read-only root with only cache + server/route-cache writable; runtime DB first render; awaited invalidation regenerates next request; handler error 503; metadata/regression proofs pass.')
} finally {
  if(server&&server.exitCode===null){server.kill('SIGTERM');await once(server,'exit')}
  await modes(app,true).catch(()=>{});await rm(temp,{recursive:true,force:true})
}
