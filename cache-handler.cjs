/* eslint-disable @typescript-eslint/no-require-imports */
// Pod-local ISR/data cache. Never seed runtime entries from build-time demo HTML or data.
const { promises: fs } = require('node:fs')
const path = require('node:path')
const { createHash, randomUUID } = require('node:crypto')
const { serialize, deserialize } = require('node:v8')

module.exports = class LabCache {
  constructor() {
    this.root = path.join(process.cwd(), '.next/cache/lab')
  }

  file(key) { return path.join(/* turbopackIgnore: true */ this.root, createHash('sha256').update(key).digest('hex')) }

  async atomic(file, value) {
    await fs.mkdir(this.root, { recursive: true })
    const temp = `${file}.${randomUUID()}.tmp`
    try {
      await fs.writeFile(/* turbopackIgnore: true */ temp, serialize(value))
      await fs.rename(temp, file)
    } finally { await fs.rm(temp, { force: true }) }
  }

  async get(key, ctx = {}) {
    let entry
    try { entry = deserialize(await fs.readFile(/* turbopackIgnore: true */ this.file(key))) } catch (error) {
      if (error.code === 'ENOENT') return null
      throw error
    }
    const tags = new Set([...entry.tags, ...(ctx.tags || []), ...(ctx.softTags || [])])
    for (const tag of tags) {
      try {
        const expired = deserialize(await fs.readFile(/* turbopackIgnore: true */ this.file(`tag:${tag}`)))
        if (expired >= entry.lastModified) return null
      } catch (error) { if (error.code !== 'ENOENT') throw error }
    }
    return { value: entry.value, lastModified: entry.lastModified }
  }

  async set(key, value, ctx = {}) {
    const headerTags = value?.headers?.['x-next-cache-tags']?.split(',') || []
    const tags = [...new Set([...(ctx.tags || []), ...(value?.tags || []), ...headerTags])]
    await this.atomic(this.file(key), { value, tags, lastModified: Date.now() })
  }

  async revalidateTag(tags) {
    // This app uses expire:0. Each pod receives the revalidation POST before any edge purge.
    const expired = Date.now()
    await Promise.all((Array.isArray(tags) ? tags : [tags]).map((tag) => this.atomic(this.file(`tag:${tag}`), expired)))
  }

  resetRequestCache() {}
}
