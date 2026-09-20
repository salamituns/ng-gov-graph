import { persistNigeriaGraph } from '@/lib/graph/persist'

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
	return Response.json({
		ok: true,
		nodes: Object.keys(graph.nodes).length,
		edges: Object.keys(graph.edges).length,
	})
}