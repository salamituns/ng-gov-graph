import { createHash } from 'node:crypto'
import { cache } from 'react'
import { loadNigeriaGraph } from './nigeria'
import { budgetFlow, budgetTotals } from './budget-flow'

/** One deterministic payload/version for both HTML and JSON. No clock enters the cache key. */
export const loadGraphResource = cache(async () => {
	const { graph, news } = await loadNigeriaGraph()
	const body = JSON.stringify({ graph, news, budget: budgetFlow(graph), budgets: budgetTotals(graph) })
	const digest = createHash('sha256').update(body).digest('hex')
	return { body, digest, url: `/api/graph?v=${digest.slice(0, 16)}` }
})
