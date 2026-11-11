import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { deserialize } from 'node:v8'
import LabCache from '../cache-handler.cjs'

const tag = 'ng-stored-data'
function page(start, text = 'runtime') {
  return { kind: 'APP_PAGE', html: `<meta name="govgraph-rendered-at" content="${start}"><p>${text}</p>`, rscData: Buffer.from('rsc'), segmentData: new Map([['x', Buffer.from('segment')]]), headers: { 'x-next-cache-tags': tag } }
}
async function fixture(fn) {
  const root = await mkdtemp(join(tmpdir(), 'lab-cache-test-'))
  const cache = new LabCache(); cache.root = root
  try { await fn(cache, root) } finally { await rm(root, { recursive: true, force: true }) }
}
test('expired page is retained as stale, with durable invalidation before acknowledgement', () => fixture(async (cache,root) => {
  const start=Date.now()-100
  await cache.set('/ng',page(start))
  await cache.revalidateTag(tag)
  const stale=await cache.get('/ng')
  assert(stale, 'last good page must survive invalidation')
  assert.equal(stale.value.headers['Cache-Control'],'no-store')
  assert(stale.lastModified < Date.now()-86400_000,'expired HTML must be stale to Next ISR')
  assert.equal(deserialize(await readFile(join(root,'manifest'))).tags[tag] > start,true)
}))
test('a render finishing after invalidation retains its generation start and cannot replace a newer render',()=>fixture(async(cache)=>{
  const start=Date.now()-1000
  await cache.revalidateTag(tag)
  await cache.set('/ng',page(start,'late old render'))
  assert((await cache.get('/ng')).lastModified < Date.now()-86400_000)
  const fresh=Date.now()+10
  await cache.set('/ng',page(fresh,'fresh'))
  await cache.set('/ng',page(start,'late old render'))
  assert.match((await cache.get('/ng')).value.html, /fresh/)
  assert.equal((await cache.get('/ng')).lastModified,fresh)
}))
test('cache is bounded and hot hits do not read tag files or deserialize the entry again',()=>fixture(async(cache,root)=>{
  cache.maxEntries=2;cache.maxBytes=4096
  await cache.set('/a',page(Date.now()-10));await cache.set('/b',page(Date.now()-10))
  const hit=await cache.get('/a')
  // A hot hit is already deserialized and must work even if its disk entry is unavailable.
  const file=join(root,createHash('sha256').update('/a').digest('hex'))
  await rm(file)
  assert.equal((await cache.get('/a')).value,hit.value)
  await cache.set('/c',page(Date.now()))
  assert.equal(await cache.get('/b'),null,'least recently used entry must be evicted')
  assert((await readdir(root)).length<=3)
  assert.deepEqual((await cache.get('/a')).value.segmentData,new Map([['x',Buffer.from('segment')]]))
}))
test('failed durable tag write rejects and does not publish a successful invalidation',()=>fixture(async(cache,root)=>{
  await cache.set('/ng',page(Date.now()))
  cache.root=join(root,'not-a-directory','child')
  const {writeFile}=await import('node:fs/promises');await writeFile(join(root,'not-a-directory'),'file')
  await assert.rejects(cache.revalidateTag(tag))
}))
test('data generation uses Next request start, while durable tags survive a process restart',()=>fixture(async(cache,root)=>{
  const {AsyncLocalStorage}=await import('node:async_hooks')
  globalThis.AsyncLocalStorage=AsyncLocalStorage
  const {createRequire}=await import('node:module')
  const require=createRequire(import.meta.url)
  const {workAsyncStorage}=require('next/dist/server/app-render/work-async-storage.external')
  const started=Date.now()-100
  await workAsyncStorage.run({requestStartTime:started},()=>cache.set('data',{kind:'FETCH',data:{body:'stored'}},{tags:[tag]}))
  assert.equal((await cache.get('data')).lastModified,started)
  await cache.revalidateTag(tag)
  const {spawn}=await import('node:child_process');const {once}=await import('node:events')
  const child=spawn(process.execPath,['--input-type=module','-e',`import Cache from ${JSON.stringify(new URL('../cache-handler.cjs',import.meta.url).href)};const c=new Cache();c.root=${JSON.stringify(root)};if(await c.get('data')!==null)process.exit(1)`],{stdio:'ignore'})
  assert.equal((await once(child,'exit'))[0],0)
}))
