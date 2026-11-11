import { revalidateTag } from 'next/cache'
import { persistNigeriaGraph } from '@/lib/graph/persist'
import { STORED_DATA_TAG } from '@/lib/graph/store'
import { reason } from '@/lib/refresh-reason'

export const maxDuration = 300

export async function GET(request: Request) {
	const secret = process.env.CRON_SECRET
	const auth = request.headers.get('authorization')
	if (!secret || auth !== `Bearer ${secret}`) {
		return new Response('unauthorized', { status: 401 })
	}
	if (process.env.NEXT_PUBLIC_LAB_BUILD === '1') return new Response('Use the refresh job', { status: 404 })
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
