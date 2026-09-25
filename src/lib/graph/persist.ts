import { nigeriaChanges } from '@/data/nigeria/changes'
import { nigeriaNews } from '@/data/nigeria/news'
import { getDb } from '@/db'
import { civicFeed, graphSnapshots } from '@/db/schema'
import { compileNigeriaGraph, parseGraphSnapshot } from '@/lib/graph/nigeria'
import { overlayNassOccupancy } from '@/lib/graph/nass-live'
import { overlayPortraits } from '@/lib/graph/portraits'
import { overlayNaltfOccupancy } from '@/lib/graph/naltf-fill'
import { overlayOrderpaperOccupancy } from '@/lib/graph/orderpaper-fill'
import { overlayWikiOccupancy, adoptConstituencyIds } from '@/lib/graph/wiki-fill'
import {
	CHANGES_FEED_ID,
	fetchCivicFeed,
	fetchNeonSnapshot,
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
			const { overlayAgencyHeads } = await import('@/lib/graph/agency-heads')
			graph = await overlayAgencyHeads(graph)
		}
		if (options?.portraits) {
			graph = await overlayPortraits(graph)
		}
		const { applyAppointments, diffOfficeholders, appointmentsFromNews, fetchAppointmentBodies, mergeChanges, mergeNews } = await import('@/lib/graph/changes')
		const { enrichNewsImages, parseChangesFeed, parseNewsFeed, parseRssNews, resolveStoredFeed } = await import('@/lib/graph/feed')
		const { mentionLabels } = await import('@/lib/graph/mentions')
		const [previousPayload, storedNews, storedChanges] = await Promise.all([
			fetchNeonSnapshot(),
			fetchCivicFeed(NEWS_FEED_ID),
			fetchCivicFeed(CHANGES_FEED_ID),
		])
		const previous = parseGraphSnapshot(previousPayload)
		const today = new Date().toISOString().slice(0, 10)
		// History accumulates: stored items are kept and new ones join them.
		let news = resolveStoredFeed(storedNews, nigeriaNews, parseNewsFeed).items
		let changes = resolveStoredFeed(storedChanges, nigeriaChanges, parseChangesFeed).items
		if (options?.monitor) {
			try {
				const { defaultCivicGenerate, extractCivicUpdates, fetchCivicSources } = await import('@/lib/ai/monitor')
				const labels = mentionLabels(graph)
				const sources = await fetchCivicSources()
				const fresh = sources.flatMap((xml) => parseRssNews(xml, labels))
				news = mergeNews(news, fresh)
				news = await enrichNewsImages(news)
				// Announcements from the whole stored history, so a seat filled weeks ago is still filled today.
				const bodies = await fetchAppointmentBodies(news)
				changes = mergeChanges(changes, appointmentsFromNews(news, labels, graph, bodies))
				if (sources[0]) {
					const extracted = await extractCivicUpdates(sources[0], defaultCivicGenerate)
					changes = mergeChanges(changes, extracted.changes)
					if (!fresh.length) news = mergeNews(news, extracted.news)
				}
			} catch {
				// A failed monitor run keeps yesterday's feeds rather than erasing them.
			}
		}
		graph = applyAppointments(graph, changes)
		changes = mergeChanges(changes, diffOfficeholders(previous, graph, today))
		await upsertSnapshot(graph)
		await upsertFeed(NEWS_FEED_ID, 'news', news)
		await upsertFeed(CHANGES_FEED_ID, 'changes', changes)
		return graph
	}
	return work()
}