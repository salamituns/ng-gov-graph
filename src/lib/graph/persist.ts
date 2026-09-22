import { nigeriaChanges } from '@/data/nigeria/changes'
import { nigeriaNews } from '@/data/nigeria/news'
import { getDb } from '@/db'
import { civicFeed, graphSnapshots } from '@/db/schema'
import { compileNigeriaGraph } from '@/lib/graph/nigeria'
import { overlayNassOccupancy } from '@/lib/graph/nass-live'
import { overlayPortraits } from '@/lib/graph/portraits'
import { overlayNaltfOccupancy } from '@/lib/graph/naltf-fill'
import { overlayOrderpaperOccupancy } from '@/lib/graph/orderpaper-fill'
import { overlayWikiOccupancy, adoptConstituencyIds } from '@/lib/graph/wiki-fill'
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

export function persistNigeriaGraph(options?: {
	liveNass?: boolean
	wikiFill?: boolean
	portraits?: boolean
	monitor?: boolean
}) {
	let graph = compileNigeriaGraph()
	const work = async () => {
		if (options?.liveNass) {
			graph = await overlayNassOccupancy(graph)
		}
		if (options?.wikiFill) {
			graph = await overlayWikiOccupancy(graph)
			graph = await overlayNaltfOccupancy(graph)
			graph = await overlayOrderpaperOccupancy(graph)
			graph = adoptConstituencyIds(graph)
		}
		if (options?.portraits) {
			graph = await overlayPortraits(graph)
		}
		await upsertSnapshot(graph)
		let news = nigeriaNews
		let changes = nigeriaChanges
		if (options?.monitor) {
			try {
				const {
					defaultCivicGenerate,
					extractCivicUpdates,
					fetchCivicSource,
				} = await import('@/lib/ai/monitor')
				const { parseRssNews } = await import('@/lib/graph/feed')
				const source = await fetchCivicSource()
				if (source) {
					const extracted = await extractCivicUpdates(
						source,
						defaultCivicGenerate,
					)
					const rss = parseRssNews(
						source,
						Object.values(graph.nodes)
							.filter((node) => node.type !== 'dept_head')
							.flatMap((node) =>
								[
									node.name,
									...node.aliases,
									...node.people.map((person) => person.name),
								].map((label) => ({
									id: node.id,
									label,
								})),
							),
					)
					if (rss.length > 0) {
						news = rss
					} else if (extracted.news.length > 0) {
						news = extracted.news
					}
					if (extracted.changes.length > 0) {
						changes = extracted.changes
					}
				}
			} catch {
				news = nigeriaNews
				changes = nigeriaChanges
			}
		}
		await upsertFeed(NEWS_FEED_ID, 'news', news)
		await upsertFeed(CHANGES_FEED_ID, 'changes', changes)
		return graph
	}
	return work()
}