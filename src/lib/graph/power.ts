import type { NewsItem } from '@/data/nigeria/news'
import type { CompiledGraph } from './types'

export type PowerWindow = 7 | 30 | 90

export interface PowerMention {
	id: string
	mentions: number
}

export function powerMap(
	news: NewsItem[],
	days: PowerWindow,
	now: Date,
): PowerMention[] {
	const cutoff = new Date(now)
	cutoff.setUTCDate(cutoff.getUTCDate() - days)
	const counts = new Map<string, number>()
	for (const item of news) {
		if (!item.publishedAt) {
			continue
		}
		const published = new Date(`${item.publishedAt}T00:00:00Z`)
		if (Number.isNaN(published.getTime()) || published < cutoff || published > now) {
			continue
		}
		for (const id of item.entityIds ?? []) {
			counts.set(id, (counts.get(id) ?? 0) + 1)
		}
	}
	return [...counts.entries()]
		.map(([id, mentions]) => ({ id, mentions }))
		.sort((a, b) => b.mentions - a.mentions || a.id.localeCompare(b.id))
}

export function peopleInNews(
	graph: CompiledGraph,
	mentions: PowerMention[],
) {
	const seen = new Set<string>()
	const people: Array<{
		id: string
		name: string
		imageUrl?: string
		mentions: number
	}> = []
	for (const mention of mentions) {
		const person = graph.nodes[mention.id]?.people[0]
		if (!person || seen.has(person.name)) {
			continue
		}
		seen.add(person.name)
		people.push({
			id: mention.id,
			name: person.name,
			imageUrl: person.imageUrl,
			mentions: mention.mentions,
		})
	}
	return people
}

export function powerSlice(graph: CompiledGraph, mentions: PowerMention[]): CompiledGraph {
	const ids = new Set([graph.constituency, ...mentions.map((item) => item.id)])
	const nodes = Object.fromEntries(
		Object.entries(graph.nodes).filter(([id]) => ids.has(id)),
	)
	const edges = Object.fromEntries(
		Object.entries(graph.edges).filter(
			(entry) => ids.has(entry[1].fromId) && ids.has(entry[1].toId),
		),
	)
	return { ...graph, nodes, edges }
}
