import { cache } from 'react'
import { nigeriaCatalog } from '@/data/nigeria/catalog'
import { nigeriaChanges } from '@/data/nigeria/changes'
import { nigeriaNews } from '@/data/nigeria/news'
import { nigeriaAgenciesCatalog } from '@/data/nigeria/agencies'
import { nigeriaInstitutionsCatalog } from '@/data/nigeria/institutions'
import { nigeriaNassCatalog } from '@/data/nigeria/nass'
import { nigeriaStatesCatalog } from '@/data/nigeria/states'
import { buildGraph } from '@/lib/graph/build-graph'
import { parseChangesFeed, parseNewsFeed, resolveStoredFeed, retagNews } from '@/lib/graph/feed'
import { mentionLabels } from '@/lib/graph/mentions'
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
		[nigeriaStatesCatalog, nigeriaNassCatalog, nigeriaAgenciesCatalog, nigeriaInstitutionsCatalog].reduce(
			mergeCatalogs,
			nigeriaCatalog,
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

function listsFor(nodes: CompiledGraph['nodes']) {
	const ids = (type: GraphNode['type']) => Object.values(nodes).filter((node) => node.type === type).map((node) => node.id)
	return {
		elected: ids('elected'),
		departments: ids('department'),
		commissions: ids('commission'),
		advisories: ids('advisory'),
		courts: ids('court'),
		corporations: ids('corporation'),
		deptHeads: ids('dept_head'),
		satellites: Object.values(nodes)
			.filter((node) => node.parentId && node.type !== 'dept_head' && node.type !== 'constituency')
			.map((node) => node.id),
	}
}

export async function resolveNigeriaGraph(
	loadPayload: () => Promise<unknown | null>,
) {
	const parsed = parseGraphSnapshot(await loadPayload())
	if (parsed) {
		// Stored snapshots carry live officeholders. Back-fill any catalog body added since the last seed.
		const catalog = compileNigeriaGraph()
		// Descriptions, sources and aliases belong to the catalog; the snapshot contributes live officeholders.
		for (const [id, node] of Object.entries(parsed.nodes)) {
			const fresh = catalog.nodes[id]
			if (!fresh) continue
			parsed.nodes[id] = {
				...node,
				description: fresh.description,
				legalSourceUrl: fresh.legalSourceUrl,
				officialUrl: fresh.officialUrl,
				aliases: fresh.aliases,
			}
		}
		// Seats are left alone: persist renames or drops placeholder seats on purpose, so only
		// organizations come back, with seats only when their organization is new too.
		const newOrgs = new Set(
			Object.values(catalog.nodes)
				.filter((node) => node.type !== 'dept_head' && !parsed.nodes[node.id])
				.map((node) => node.id),
		)
		// New head seats (holder not yet recorded) are safe to add to existing bodies: persist never renames them.
		const missing = Object.values(catalog.nodes)
			.filter((node) => !parsed.nodes[node.id])
			.filter((node) => newOrgs.has(node.id) || (node.type === 'dept_head' && node.parentId && (newOrgs.has(node.parentId) || node.unrecorded)))
			.map((node) => node.id)
		if (!missing.length) return { graph: parsed, source: 'neon' as const }

		const nodes = { ...parsed.nodes }
		const edges = { ...parsed.edges }
		const added = new Set(missing)
		for (const id of missing) {
			nodes[id] = { ...catalog.nodes[id], edges: [], connectedNodes: [] }
			const parentId = catalog.nodes[id].parentId
			if (catalog.nodes[id].type === 'dept_head' && parentId && nodes[parentId] && !nodes[parentId].head) {
				nodes[parentId] = { ...nodes[parentId], head: id }
			}
		}
		for (const edge of Object.values(catalog.edges)) {
			if (!added.has(edge.fromId) && !added.has(edge.toId)) continue
			if (!nodes[edge.fromId] || !nodes[edge.toId] || edges[edge.id]) continue
			edges[edge.id] = edge
			for (const [id, peerId] of [[edge.fromId, edge.toId], [edge.toId, edge.fromId]]) {
				const node = nodes[id]
				nodes[id] = {
					...node,
					edges: [...node.edges, edge.id],
					connectedNodes: node.connectedNodes.includes(peerId)
						? node.connectedNodes : [...node.connectedNodes, peerId],
				}
			}
		}
		return {
			graph: {
				...parsed, nodes, edges,
				...listsFor(nodes),
			},
			source: 'neon' as const,
		}
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
		news: retagNews(news.items, mentionLabels(resolved.graph)),
		newsSource: news.source,
		changesSource: changes.source,
		source: resolved.source,
	}
})

export function getNode(graph: CompiledGraph, id: string): GraphNode | undefined {
	return graph.nodes[id]
}
