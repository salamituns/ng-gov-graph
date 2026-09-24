import type { NewsItem } from '@/data/nigeria/news'
import { primarySeats } from './mentions'
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

export interface PowerPerson {
	/** The seat-holding organization the person is credited to. */
	nodeId: string
	name: string
	job: string
	imageUrl?: string
	party?: string
	sector: string
	total: number
	latest?: { date: string; headline: string; url: string }
}

export interface PowerLink {
	fromId: string
	toId: string
}

/**
 * Ranks officeholders by the stories that name them or the office they hold, then links
 * the ones who appoint each other, mirroring the CivLab power map.
 */
export function powerPeople(graph: CompiledGraph, news: NewsItem[], days: number, now: Date, limit = 20) {
	const cutoff = new Date(now)
	cutoff.setUTCDate(cutoff.getUTCDate() - days)
	const primary = primarySeats(graph)
	const tally = new Map<string, PowerPerson>()
	let articles = 0
	const sources = new Set<string>()
	for (const item of news) {
		const published = item.publishedAt ? new Date(`${item.publishedAt.slice(0, 10)}T00:00:00Z`) : undefined
		if (published && (published < cutoff || published > now)) continue
		articles += 1
		sources.add(item.publication)
		const named = new Set<string>()
		for (const id of new Set(item.entityIds ?? [])) {
			const person = graph.nodes[id]?.people[0]
			if (person?.name) named.add(person.name)
		}
		for (const name of named) {
			const node = primary.get(name)
			const person = node?.people.find((candidate) => candidate.name === name)
			if (!node || !person) continue
			const head = node.head ? graph.nodes[node.head] : undefined
			const entry = tally.get(name) ?? {
				nodeId: node.id,
				name,
				job: head?.name ?? node.name,
				imageUrl: person.imageUrl,
				party: person.party,
				sector: node.sector ?? 'executive',
				total: 0,
			}
			entry.total += 1
			const date = item.publishedAt?.slice(0, 10)
			if (date && (!entry.latest || date > entry.latest.date)) {
				entry.latest = { date, headline: item.summary.replace(/<[^>]+>/g, ''), url: item.url }
			}
			tally.set(name, entry)
		}
	}
	const people = [...tally.values()]
		.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
		.slice(0, limit)
	const shown = new Set(people.map((person) => person.nodeId))
	const links: PowerLink[] = []
	for (const edge of Object.values(graph.edges)) {
		if (edge.type !== 'appoints') continue
		const toOrg = graph.nodes[edge.toId]?.parentId ?? edge.toId
		if (shown.has(edge.fromId) && shown.has(toOrg) && edge.fromId !== toOrg) {
			links.push({ fromId: edge.fromId, toId: toOrg })
		}
	}
	return { people, links, articles, sources: [...sources], days }
}
