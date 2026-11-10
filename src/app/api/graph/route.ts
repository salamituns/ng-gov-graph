import { createHash } from 'node:crypto'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { budgetFlow, budgetTotals } from '@/lib/graph/budget-flow'

// The stored-data tag invalidates this output when the daily refresh succeeds.
export const dynamic = 'force-static'
export const revalidate = false

export async function GET() {
	const { graph, news } = await loadNigeriaGraph()
	const body = JSON.stringify({ graph, news, budget: budgetFlow(graph), budgets: budgetTotals(graph) })
	return new Response(body, {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			// The browser reuses one download across pages, with a bounded five-minute freshness window.
			'Cache-Control': 'public, max-age=300, must-revalidate',
			ETag: `"${createHash('sha256').update(body).digest('hex')}"`,
		},
	})
}
