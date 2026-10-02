import { revalidateTag } from 'next/cache'
import { persistNigeriaGraph } from '@/lib/graph/persist'
import { STORED_DATA_TAG } from '@/lib/graph/store'

export const maxDuration = 300

/**
 * Why a refresh failed, short enough to read: the database's own message (a quota, a missing table, a
 * wrong password), not the query, whose parameters carry the whole snapshot and bury the cause in the logs.
 */
function reason(error: unknown): string {
	const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error
	const message = cause instanceof Error ? cause.message : String(cause)
	const code = typeof cause === 'object' && cause && 'code' in cause ? ` (${String(cause.code)})` : ''
	return `${message.slice(0, 300)}${code}`
}

export async function GET(request: Request) {
	const secret = process.env.CRON_SECRET
	const auth = request.headers.get('authorization')
	if (!secret || auth !== `Bearer ${secret}`) {
		return new Response('unauthorized', { status: 401 })
	}
	let graph
	try {
		graph = await persistNigeriaGraph({
			liveNass: true,
			wikiFill: true,
			portraits: true,
			monitor: true,
		})
	} catch (error) {
		console.error(`refresh failed: ${reason(error)}`)
		return Response.json({ ok: false, error: reason(error) }, { status: 500 })
	}
	// Pages read the stored data through a cache (loadStoredData): the next visitor gets today's.
	revalidateTag(STORED_DATA_TAG, { expire: 0 })
	return Response.json({
		ok: true,
		nodes: Object.keys(graph.nodes).length,
		edges: Object.keys(graph.edges).length,
	})
}