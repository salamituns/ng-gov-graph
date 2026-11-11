/* eslint-disable @typescript-eslint/no-require-imports */
// Pod-local cache: never read build prerenders. Pinned to Next 16.4.6's cache interface.
const { promises: fs } = require('node:fs')
const path = require('node:path')
const { createHash, randomUUID } = require('node:crypto')
const { serialize, deserialize } = require('node:v8')
const states = globalThis[Symbol.for('govgraph.lab-cache')] ||= new Map()
const DAY = 86400_000

function generationStart(value) {
  let start
  if (value?.kind === 'APP_PAGE') start = Number(value.html.match(/name="govgraph-rendered-at" content="([\d.]+)"/)?.[1])
  else if (value?.kind === 'APP_ROUTE') start = Number(value.headers?.['x-govgraph-rendered-at'])
  else start = require('next/dist/server/app-render/work-async-storage.external').workAsyncStorage.getStore()?.requestStartTime
  if (!Number.isFinite(start) || start <= 0) throw new Error('Lab cache entry has no generation start')
  return start
}

module.exports = class LabCache {
  constructor() {
    this.root = path.join(process.cwd(), '.next/cache/lab')
    this.maxEntries = 256
    this.maxBytes = 64 * 1024 * 1024
    this.maxMemoryBytes = 8 * 1024 * 1024
  }
  file(key) { return path.join(/* turbopackIgnore: true */ this.root, key) }
  key(key) { return createHash('sha256').update(key).digest('hex') }

  async atomic(file, value) {
    await fs.mkdir(this.root, { recursive: true })
    const temp = `${file}.${randomUUID()}.tmp`
    let handle
    try {
      handle = await fs.open(/* turbopackIgnore: true */ temp, 'wx')
      await handle.writeFile(serialize(value)); await handle.sync(); await handle.close(); handle = null
      await fs.rename(temp, file)
      const directory = await fs.open(/* turbopackIgnore: true */ this.root, 'r')
      try { await directory.sync() } finally { await directory.close() }
    } finally { if (handle) await handle.close(); await fs.rm(temp, { force: true }) }
  }
  async state() {
    let state = states.get(this.root)
    if (!state) {
      state = { tags: {}, entries: new Map(), values: new Map(), memoryBytes: 0, tail: Promise.resolve() }
      states.set(this.root, state)
      state.ready = (async () => {
        await fs.mkdir(this.root, { recursive: true })
        try {
          const saved = deserialize(await fs.readFile(/* turbopackIgnore: true */ this.file('manifest')))
          state.tags = saved.tags
          state.entries = new Map(saved.entries)
        } catch (error) { if (error.code !== 'ENOENT') throw error }
        // Recover interrupted writes and evictions without retaining unindexed blobs.
        for (const file of await fs.readdir(/* turbopackIgnore: true */ this.root)) {
          if (file !== 'manifest' && !state.entries.has(file)) await fs.rm(this.file(file), { force: true })
        }
      })()
    }
    await state.ready
    return state
  }
  serial(state, fn) {
    const result = state.tail.then(fn)
    state.tail = result.catch(() => {})
    return result
  }
  manifest(state, tags = state.tags, entries = state.entries) {
    return this.atomic(this.file('manifest'), { tags, entries: [...entries] })
  }
  remember(state, key, value, size) {
    if (state.values.has(key)) { state.memoryBytes -= state.values.get(key).size; state.values.delete(key) }
    state.values.set(key, { value, size }); state.memoryBytes += size
    while (state.memoryBytes > this.maxMemoryBytes) {
      const oldest = state.values.keys().next().value
      state.memoryBytes -= state.values.get(oldest).size; state.values.delete(oldest)
    }
  }
  async get(key, ctx = {}) {
    const state = await this.state()
    return this.serial(state, async () => {
      const hashed = this.key(key), meta = state.entries.get(hashed)
      if (!meta) return null
      const tags = [...meta.tags, ...(ctx.tags || []), ...(ctx.softTags || [])]
      const expired = tags.some((tag) => (state.tags[tag] ?? -Infinity) >= meta.lastModified)
      // Data reads must block for fresh DB data; HTML remains available during a failed regeneration.
      if (expired && meta.kind === 'FETCH') return null
      let value = state.values.get(hashed)?.value
      if (!value) {
        try { value = deserialize(await fs.readFile(/* turbopackIgnore: true */ this.file(hashed))) }
        catch (error) { if (error.code === 'ENOENT') return null; throw error }
      }
      state.entries.delete(hashed); state.entries.set(hashed, meta)
      this.remember(state, hashed, value, meta.size)
      // A stale fallback must not refill Cloudflare for a day after the zone purge.
      const served = expired ? { ...value, headers: { ...value.headers, 'Cache-Control': 'no-store' } } : value
      return { value: served, lastModified: expired ? Math.min(meta.lastModified, Date.now() - DAY - 1000) : meta.lastModified }
    })
  }
  async set(key, value, ctx = {}) {
    if (!value) return
    const started = generationStart(value)
    const state = await this.state()
    return this.serial(state, async () => {
      const hashed = this.key(key), previous = state.entries.get(hashed)
      // An older render must never replace a newer successful representation.
      if (previous && previous.lastModified > started) return
      const size = serialize(value).byteLength
      if (size > this.maxBytes) throw new Error('Lab cache entry exceeds byte limit')
      const headerTags = value.headers?.['x-next-cache-tags']?.split(',') || []
      const tags = [...new Set([...(ctx.tags || []), ...(value.tags || []), ...headerTags])]
      const entries = new Map(state.entries)
      entries.delete(hashed)
      entries.set(hashed, { kind: value.kind, lastModified: started, tags, size })
      let bytes = [...entries.values()].reduce((sum, entry) => sum + entry.size, 0)
      const evicted = []
      while (entries.size > this.maxEntries || bytes > this.maxBytes) {
        const oldest = entries.keys().next().value
        bytes -= entries.get(oldest).size; entries.delete(oldest); evicted.push(oldest)
      }
      // Evict before writing so disk usage stays bounded (plus one manifest and atomic temp).
      for (const file of evicted) {
        await fs.rm(this.file(file), { force: true })
        if (state.values.has(file)) { state.memoryBytes -= state.values.get(file).size; state.values.delete(file) }
      }
      await this.atomic(this.file(hashed), value)
      await this.manifest(state, state.tags, entries)
      state.entries = entries
      this.remember(state, hashed, value, size)
    })
  }
  async revalidateTag(tags) {
    const state = await this.state()
    return this.serial(state, async () => {
      const next = { ...state.tags }
      for (const tag of [tags].flat()) next[tag] = Date.now()
      // Publish to memory only after the file, rename and directory have been synced.
      await this.manifest(state, next)
      state.tags = next
    })
  }
  resetRequestCache() {}
}
