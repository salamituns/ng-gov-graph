import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import LabCache from '../cache-handler.cjs'

test('lab cache is cold, persists binary page data and invalidates tagged pages across instances', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lab-cache-test-'))
  const cache = new LabCache(); cache.root = root
  const other = new LabCache(); other.root = root
  try {
    assert.equal(await cache.get('/ng'), null)
    const value = { kind: 'APP_PAGE', html: '<p>runtime</p>', rscData: Buffer.from('rsc'), segmentData: new Map([['x', Buffer.from('segment')]]), headers: { 'x-next-cache-tags': 'ng-stored-data' } }
    await cache.set('/ng', value)
    assert.deepEqual((await other.get('/ng')).value, value)
    await other.revalidateTag('ng-stored-data')
    assert.equal(await cache.get('/ng'), null)
    await cache.set('fetch', { kind: 'FETCH', data: {} }, { tags: ['stored'] })
    await other.revalidateTag(['stored'])
    assert.equal(await cache.get('fetch'), null)
    await cache.set('soft', { kind: 'FETCH', data: {} })
    await other.revalidateTag('soft-tag')
    assert.equal(await cache.get('soft', { softTags: ['soft-tag'] }), null)
  } finally { await rm(root, { recursive: true, force: true }) }
})
