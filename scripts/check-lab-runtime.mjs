// Run after LAB_BUILD=1 npm run build. Never logs dotenv values.
import assert from 'node:assert/strict'
import { cp, mkdtemp, readFile, readdir, chmod, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { randomBytes, createHash } from 'node:crypto'
import { deserialize } from 'node:v8'
import { getRouteCacheKey } from 'next/dist/server/lib/route-cache-key.js'

try { process.loadEnvFile('.env.local') } catch (error) { if (error.code !== 'ENOENT') throw error }
if (!process.env.DATABASE_URL) throw new Error('No local DATABASE_URL: runtime DB proof unavailable')
const temp = await mkdtemp(join(tmpdir(), 'govgraph-readonly-'))
const app = join(temp, 'app')
let server
async function modes(dir, writable) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name)
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) await modes(file, writable)
    await chmod(file, writable ? (entry.isDirectory() ? 0o755 : 0o644) : (entry.isDirectory() ? 0o555 : 0o444))
  }
  await chmod(dir, writable ? 0o755 : 0o555)
}
try {
  await cp('.next/standalone', app, { recursive: true })
  assert(!(await readdir(app)).some((file) => file.startsWith('.env')))
  assert.equal((await readdir(join(app, '.next/cache'))).length, 0)
  const demo = JSON.parse(await readFile(join(app, '.next/server/app/api/graph.body'), 'utf8'))
  const demoDigest = createHash('sha256').update(JSON.stringify(demo)).digest('hex').slice(0,16)
  const adapter = spawn(process.execPath, ['--input-type=module', '-e', `const {persist}=await import('./refresh-persist.mjs');const {default:assert}=await import('node:assert/strict');await assert.rejects(persist(),/DATABASE_URL is required/);console.log('PASS: actual standalone persistence adapter imports and validates configuration without a Next server.')`], {cwd:app,env:{...process.env,DATABASE_URL:''},stdio:'inherit'})
  assert.equal((await once(adapter,'exit'))[0],0)
  await modes(app, false)
  await modes(join(app, '.next/cache'), true)
  const secret = randomBytes(24).toString('hex')
  const preload = join(temp, 'delay-write.mjs')
  await writeFile(preload, `import fs from 'node:fs/promises';import path from 'node:path';const rename=fs.rename;fs.rename=async(a,b)=>{const flag=path.join(process.cwd(),'.next/cache/hold-write');if(String(b).endsWith('/lab/manifest')){try{await fs.access(flag);await fs.writeFile(path.join(process.cwd(),'.next/cache/write-blocked'),'yes');while(true){try{await fs.access(flag)}catch{break}await new Promise(r=>setTimeout(r,20))}}catch{}}return rename(a,b)};`)
  server = spawn(process.execPath, ['--import',preload,'server.js'], { cwd: app, env: { ...process.env, HOSTNAME: '127.0.0.1', PORT: '3000', CRON_SECRET: secret, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore','ignore','pipe'] })
  let errors = ''; server.stderr.on('data', (data) => errors += data)
  const origin = 'http://127.0.0.1:3000'
  let health
  for (let i=0;i<150;i++) {
    try { health = await fetch(`${origin}/healthz`); break } catch { await new Promise((done) => setTimeout(done,100)) }
  }
  assert(health, 'Server did not start'); assert.equal(health.status,200); assert.equal(await health.text(),'ok')
  assert.equal((await readdir(join(app, '.next/cache'))).length, 0, 'Health must not populate the data cache')
  const home = await fetch(`${origin}/ng`); assert.equal(home.status,200)
  const html = await home.text()
  const graphUrl = html.match(/\/api\/graph\/[a-f0-9]{16}/)?.[0]; assert(graphUrl)
  const graph = await fetch(origin+graphUrl); assert.equal(graph.status,200)
  const data = await graph.text()
  assert.notEqual(graphUrl.split('/').at(-1), demoDigest, 'Runtime graph must differ from no-DB build catalog')
  assert.equal(createHash('sha256').update(data).digest('hex').slice(0,16),graphUrl.split('/').at(-1))
  assert.equal((await fetch(`${origin}/ng/departments/ng-ministry-of-finance`)).status,200)
  assert.equal((await fetch(`${origin}/api/revalidate`, { method: 'POST' })).status,401)
  assert.equal((await fetch(`${origin}/api/revalidate`)).status,405)
  const cache = join(app, '.next/cache/lab')
  async function homeEntry() {
    const file = createHash('sha256').update(getRouteCacheKey('/ng', {kind:'APP_PAGE',sourceRoute:'/ng/page'})).digest('hex')
    const manifest = deserialize(await readFile(join(cache,'manifest')))
    return new Map(manifest.entries).get(file)
  }
  const before = await homeEntry()
  const hold = join(app,'.next/cache/hold-write')
  await writeFile(hold,'hold')
  let acknowledged = false
  const pending = fetch(`${origin}/api/revalidate`, { method:'POST',headers:{Authorization:`Bearer ${secret}`} }).then(response=>{acknowledged=true;return response})
  for(let i=0;i<100;i++) {try{await readFile(join(app,'.next/cache/write-blocked'));break}catch{await new Promise(done=>setTimeout(done,20))}}
  assert.equal(await readFile(join(app,'.next/cache/write-blocked'),'utf8'),'yes','Durability probe did not reach the tag write')
  assert.equal(acknowledged,false,'200 must wait for the durable tag write')
  await rm(hold)
  const revalidation = await pending
  assert.equal(revalidation.status,200); assert.deepEqual(await revalidation.json(),{ok:true})
  assert(deserialize(await readFile(join(cache,'manifest'))).tags['ng-stored-data'] >= before.lastModified, 'Tag must already be on disk at 200')
  assert.equal((await fetch(`${origin}/ng`)).status,200)
  for(let i=0;i<100 && (await homeEntry()).lastModified <= before.lastModified;i++) await new Promise(done=>setTimeout(done,50))
  assert((await homeEntry()).lastModified > before.lastModified,'Tag invalidation must regenerate runtime HTML')
  assert(!/EROFS|EACCES|Failed to update prerender cache/.test(errors),'Read-only filesystem rejected a write')
  // Force a genuine filesystem failure: acknowledgement must fail, not schedule work after 200.
  await chmod(cache,0o555)
  const failed = await fetch(`${origin}/api/revalidate`,{method:'POST',headers:{Authorization:`Bearer ${secret}`}})
  assert.equal(failed.status,503)
  await chmod(cache,0o755)
  console.log('PASS: delayed tag write blocks 200; manifest is durable at acknowledgement; failed tag write returns 503.')
  // Use the existing regression checks against the same runtime and its known-good cache.
  const check = spawn(process.execPath, [resolve('scripts/check-page-cache.mjs'), origin], { stdio:'inherit' })
  assert.equal((await once(check,'exit'))[0],0)
  const outage = spawn(process.execPath, [resolve('scripts/check-regeneration-failure.mjs')], { env:{...process.env,LAB_RUNTIME_ARTIFACT:app},stdio:'inherit' })
  assert.equal((await once(outage,'exit'))[0],0)
  console.log('PASS: port 3000, read-only standalone; only .next/cache writable; health leaves cache empty; runtime DB graph differs from build catalog; home/entity/graph 200; POST 401/200, GET 405; tag regeneration succeeds.')
} finally {
  if(server && server.exitCode === null) { server.kill('SIGTERM'); await once(server,'exit') }
  await modes(app,true).catch(()=>{})
  await rm(temp,{recursive:true,force:true})
}
