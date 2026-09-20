import { nigeriaChanges } from '@/data/nigeria/changes'
import { nigeriaNews } from '@/data/nigeria/news'
import { getDb } from '@/db'
import { civicFeed, graphSnapshots } from '@/db/schema'
import { compileNigeriaGraph } from '@/lib/graph/nigeria'
import { overlayNassOccupancy } from '@/lib/graph/nass-live'
import {
	CHANGES_FEED_ID,
	NEWS_FEED_ID,
	NIGERIA_SNAPSHOT_ID,
} from '@/lib/graph/store'
import type { CompiledGraph } from '@/lib/graph/types'

async function upsertSnapshot(graph: CompiledGraph) {
	const db = getDb()
	await db
		.insert(graphSnapshots)
		.values({
			id: NIGERIA_SNAPSHOT_ID,
			compiledAt: new Date(),
			nodeCount: Object.keys(graph.nodes).length,
			edgeCount: Object.keys(graph.edges).length,
			payload: graph,
		})
		.onConflictDoUpdate({
			target: graphSnapshots.id,
			set: {
				compiledAt: new Date(),
				nodeCount: Object.keys(graph.nodes).length,
				edgeCount: Object.keys(graph.edges).length,
				payload: graph,
			},
		})
}

async function upsertFeed(id: string, kind: string, payload: unknown) {
	const db = getDb()
	await db
		.insert(civicFeed)
		.values({
			id,
			kind,
			payload,
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: civicFeed.id,
			set: {
				kind,
				payload,
				updatedAt: new Date(),
			},
		})
}

export async function persistNigeriaGraph(options?: { liveNass?: boolean }) {
	let graph = compileNigeriaGraph()
	if (options?.liveNass) {
		graph = await overlayNassOccupancy(graph)
	}
	await upsertSnapshot(graph)
	await upsertFeed(NEWS_FEED_ID, 'news', nigeriaNews)
	await upsertFeed(CHANGES_FEED_ID, 'changes', nigeriaChanges)
	return graph
}