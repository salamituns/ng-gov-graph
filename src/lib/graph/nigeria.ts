import { cache } from 'react'
import { nigeriaCatalog } from '@/data/nigeria/catalog'
import { nigeriaChanges } from '@/data/nigeria/changes'
import { nigeriaNews } from '@/data/nigeria/news'
import { nigeriaAgenciesCatalog } from '@/data/nigeria/agencies'
import { nigeriaNassCatalog } from '@/data/nigeria/nass'
import { nigeriaStatesCatalog } from '@/data/nigeria/states'
import { buildGraph } from '@/lib/graph/build-graph'
import { parseChangesFeed, parseNewsFeed, resolveStoredFeed } from '@/lib/graph/feed'
import { summarizeOverview } from '@/lib/graph/overview'
import {
	CHANGES_FEED_ID,
	fetchCivicFeed,
	fetchNeonSnapshot,
	NEWS_FEED_ID,
} from '@/lib/graph/store'
import type { Catalog, CompiledGraph, GraphNode } from '@/lib/graph/types'

function mergeCatalogs(base: Catalog, extra: Catalog): Catalog {
	return {
		...base,
		entities: [...base.entities, ...extra.entities],
		elects: [...base.elects, ...extra.elects],
		oversees: [...base.oversees, ...extra.oversees],
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function compileNigeriaGraph(): CompiledGraph {
	return buildGraph(
		mergeCatalogs(
			mergeCatalogs(
				mergeCatalogs(nigeriaCatalog, nigeriaStatesCatalog),
				nigeriaNassCatalog,
			),
			nigeriaAgenciesCatalog,
		),
	)
}

export function parseGraphSnapshot(value: unknown): CompiledGraph | null {
	if (!isRecord(value)) {
		return null
	}
	if (!isRecord(value.nodes) || !isRecord(value.edges)) {
		return null
	}
	if (typeof value.constituency !== 'string' || value.constituency.length === 0) {
		return null
	}
	return value as unknown as CompiledGraph
}

export async function resolveNigeriaGraph(
	loadPayload: () => Promise<unknown | null>,
) {
	const parsed = parseGraphSnapshot(await loadPayload())
	if (parsed) {
		return { graph: parsed, source: 'neon' as const }
	}
	return { graph: compileNigeriaGraph(), source: 'catalog' as const }
}

export const loadNigeriaGraph = cache(async () => {
	const [resolved, newsPayload, changesPayload] = await Promise.all([
		resolveNigeriaGraph(fetchNeonSnapshot),
		fetchCivicFeed(NEWS_FEED_ID),
		fetchCivicFeed(CHANGES_FEED_ID),
	])
	const news = resolveStoredFeed(newsPayload, nigeriaNews, parseNewsFeed)
	const changes = resolveStoredFeed(
		changesPayload,
		nigeriaChanges,
		parseChangesFeed,
	)
	return {
		gov: 'ng' as const,
		name: 'Federal Republic of Nigeria',
		graph: resolved.graph,
		overview: summarizeOverview(resolved.graph),
		changes: changes.items,
		news: news.items,
		newsSource: news.source,
		changesSource: changes.source,
		source: resolved.source,
	}
})

export function getNode(graph: CompiledGraph, id: string): GraphNode | undefined {
	return graph.nodes[id]
}
