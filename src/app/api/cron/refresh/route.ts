import { revalidateTag } from 'next/cache'
import { persistNigeriaGraph } from '@/lib/graph/persist'
import { STORED_DATA_TAG } from '@/lib/graph/store'

export const maxDuration = 300

export async function GET(request: Request) {
	const secret = process.env.CRON_SECRET
	const auth = request.headers.get('authorization')
	if (!secret || auth !== `Bearer ${secret}`) {
		return new Response('unauthorized', { status: 401 })
	}
	const graph = await persistNigeriaGraph({
		liveNass: true,
		wikiFill: true,
		portraits: true,
		monitor: true,
	})
	// Pages read the stored data through a cache (loadStoredData): the next visitor gets today's.
	revalidateTag(STORED_DATA_TAG, { expire: 0 })
	return Response.json({
		ok: true,
		nodes: Object.keys(graph.nodes).length,
		edges: Object.keys(graph.edges).length,
	})
}