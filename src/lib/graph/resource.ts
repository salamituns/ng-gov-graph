import { createHash } from 'node:crypto'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { gzipSync } from 'node:zlib'
import { loadNigeriaGraph } from './nigeria'
import { budgetFlow, budgetTotals } from './budget-flow'
import { STORED_DATA_TAG } from './store'

/** Serialization and hashing happen once per tagged data generation, not once per entity page. */
const cachedResource = unstable_cache(async () => {
	const { graph, news } = await loadNigeriaGraph()
	const body = JSON.stringify({ graph, news, budget: budgetFlow(graph), budgets: budgetTotals(graph) })
	const digest = createHash('sha256').update(body).digest('hex')
	return { compressed: gzipSync(body).toString('base64'), digest, url: `/api/graph/${digest.slice(0, 16)}` }
}, ['ng-graph-resource-v1'], { tags: [STORED_DATA_TAG], revalidate: 86400 })

export const loadGraphResource = cache(cachedResource)
