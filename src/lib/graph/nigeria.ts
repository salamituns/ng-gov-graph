import { cache } from 'react'
import { nigeriaChanges } from '@/data/nigeria/changes'
import { nigeriaNews } from '@/data/nigeria/news'
import { parseChangesFeed, parseNewsFeed, resolveStoredFeed, retagNews } from '@/lib/graph/feed'
import { mentionLabels } from '@/lib/graph/mentions'
import { summarizeOverview } from '@/lib/graph/overview'
import { loadStoredData } from '@/lib/graph/store'

import { resolveNigeriaGraph } from './nigeria-compile'
export { compileNigeriaGraph, parseGraphSnapshot, resolveNigeriaGraph } from './nigeria-compile'
import type { CompiledGraph, GraphNode } from './types'

export const loadNigeriaGraph = cache(async () => {
	// One cached read for the snapshot and both feeds (see loadStoredData): not a database round trip per page.
	const stored = await loadStoredData()
	const resolved = await resolveNigeriaGraph(async () => stored.snapshot)
	const newsPayload = stored.news
	const changesPayload = stored.changes
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
		news: retagNews(news.items, mentionLabels(resolved.graph)),
		newsSource: news.source,
		changesSource: changes.source,
		source: resolved.source,
	}
})

export function getNode(graph: CompiledGraph, id: string): GraphNode | undefined {
	return graph.nodes[id]
}
