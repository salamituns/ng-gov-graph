// A restarted process must never inherit cache entries whose in-memory tags it has lost.
import { mkdir, readdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const app = dirname(fileURLToPath(import.meta.url))
for (const relative of ['.next/cache', '.next/server/route-cache']) {
  const directory = join(app, relative)
  await mkdir(directory, { recursive: true })
  // Empty the contents, preserving the Kubernetes mount root and its permissions.
  for (const name of await readdir(directory)) await rm(join(directory, name), { recursive: true, force: true })
}
createRequire(import.meta.url)('./server.js')
