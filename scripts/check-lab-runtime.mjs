// Run after LAB_BUILD=1 npm run build. Never logs dotenv values.
import assert from 'node:assert/strict'
import { cp, mkdtemp, readFile, readdir, chmod, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { randomBytes, createHash } from 'node:crypto'
import { deserialize } from 'node:v8'

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
  server = spawn(process.execPath, ['server.js'], { cwd: app, env: { ...process.env, HOSTNAME: '127.0.0.1', PORT: '3000', CRON_SECRET: secret, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore','ignore','pipe'] })
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
    const file = createHash('sha256').update('/ng').digest('hex')
    return deserialize(await readFile(join(cache,file)))
  }
  const before = await homeEntry()
  const revalidation = await fetch(`${origin}/api/revalidate`, { method:'POST',headers:{Authorization:`Bearer ${secret}`} })
  assert.equal(revalidation.status,200); assert.deepEqual(await revalidation.json(),{ok:true})
  assert.equal((await fetch(`${origin}/ng`)).status,200)
  assert((await homeEntry()).lastModified > before.lastModified,'Tag invalidation must regenerate runtime HTML')
  assert(!/EROFS|EACCES|Failed to update prerender cache/.test(errors),'Read-only filesystem rejected a write')
  // Use the existing regression checks against the same runtime and its known-good cache.
  const check = spawn(process.execPath, [resolve('scripts/check-page-cache.mjs'), origin], { stdio:'inherit' })
  assert.equal((await once(check,'exit'))[0],0)
  const outage = spawn(process.execPath, [resolve('scripts/check-regeneration-failure.mjs')], { env:{...process.env,LAB_CACHE_SEED:cache},stdio:'inherit' })
  assert.equal((await once(outage,'exit'))[0],0)
  console.log('PASS: port 3000, read-only standalone; only .next/cache writable; health leaves cache empty; runtime DB graph differs from build catalog; home/entity/graph 200; POST 401/200, GET 405; tag regeneration succeeds.')
} finally {
  if(server && server.exitCode === null) { server.kill('SIGTERM'); await once(server,'exit') }
  await modes(app,true).catch(()=>{})
  await rm(temp,{recursive:true,force:true})
}
