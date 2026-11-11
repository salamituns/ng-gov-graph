// Exercise the shipped CLI with persistence/DNS stubbed at their boundaries.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdtemp, cp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'

const temp = await mkdtemp(join(tmpdir(), 'govgraph-refresh-'))
const servers = []
const events = []
let failPod = false, failCf = false
async function listen(handler) {
  const server = createServer(handler); servers.push(server)
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  return server.address().port
}
try {
  const podPorts = await Promise.all([0, 1].map((id) => listen(async (req, res) => {
    assert.equal(req.method, 'POST'); assert.equal(req.url, '/api/revalidate')
    assert.equal(req.headers.authorization, 'Bearer test-cron')
    events.push(`pod${id}`)
    res.writeHead(failPod && id === 1 ? 500 : 200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: !(failPod && id === 1) }))
  })))
  assert.notEqual(podPorts[0], podPorts[1])
  const cfPort = await listen(async (req, res) => {
    assert.equal(req.method, 'POST'); assert.equal(req.url, '/client/v4/zones/test-zone/purge_cache')
    assert.equal(req.headers.authorization, 'Bearer test-cf')
    let body = ''; for await (const chunk of req) body += chunk
    assert.deepEqual(JSON.parse(body), { purge_everything: true })
    assert(events.includes('pod0') && events.includes('pod1'))
    events.push('purge')
    res.writeHead(failCf ? 500 : 200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: !failCf }))
  })
  await cp(resolve('build/refresh.mjs'), join(temp, 'refresh.mjs'))
  await writeFile(join(temp, 'refresh-persist.mjs'), `export async function persist() { if (process.env.TEST_FAIL_PERSIST) throw new Error('stub persistence failure'); console.log('stub persistence complete') }`)
  await writeFile(join(temp, 'preload.mjs'), `import dns from 'node:dns';
    dns.promises.resolve4 = async (host) => { if(host !== 'pods.test') throw new Error('unexpected host'); return ['127.0.0.10', '127.0.0.11', '127.0.0.10'] };
    const original = globalThis.fetch;
    globalThis.fetch = (url, options) => { const u = new URL(url); const ports = ${JSON.stringify(podPorts)}; const index = ['127.0.0.10','127.0.0.11'].indexOf(u.hostname); if(index >= 0) { if(u.port !== '3000') throw new Error('wrong service port'); u.hostname='127.0.0.1'; u.port=String(ports[index]); } return original(u,options) };
  `)
  async function run(extra = {}) {
    events.length = 0
    const child = spawn(process.execPath, ['--import', join(temp, 'preload.mjs'), 'refresh.mjs'], {
      cwd: temp, env: { ...process.env, REVALIDATE_HOST: 'pods.test', REVALIDATE_PORT: '3000', CRON_SECRET: 'test-cron', CF_ZONE_ID: 'test-zone', CF_API_TOKEN: 'test-cf', CF_API_BASE: `http://127.0.0.1:${cfPort}/client/v4/`, ...extra }, stdio: ['ignore','pipe','pipe'],
    })
    let output = ''; child.stdout.on('data', (data) => output += data); child.stderr.on('data', (data) => output += data)
    const [code] = await once(child, 'exit')
    assert(output.length < 1500); assert(!output.includes('test-cron') && !output.includes('test-cf'))
    return { code, output }
  }
  assert.equal((await run()).code, 0); assert.deepEqual(events.slice().sort(), ['pod0','pod1','purge'])
  failPod = true
  const failed = await run(); assert.notEqual(failed.code, 0); assert.match(failed.output, /1\/2 pod revalidations failed; purge skipped/)
  assert.deepEqual(events.slice().sort(), ['pod0','pod1'])
  failPod = false
  assert.notEqual((await run({ TEST_FAIL_PERSIST: '1' })).code, 0); assert.deepEqual(events, [])
  failCf = true
  assert.notEqual((await run()).code, 0); assert.equal(events.at(-1), 'purge')
  console.log('PASS: shipped node refresh.mjs; two distinct pod ports; all pods before purge; pod/persistence failure skips purge; Cloudflare failure exits nonzero; short redacted logs.')
} finally {
  await Promise.all(servers.map((server) => new Promise((done) => server.close(done))))
  await rm(temp, { recursive: true, force: true })
}
