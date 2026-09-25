import type { NewsItem } from '@/data/nigeria/news'
import { primarySeats } from './mentions'
import { newsHeadline } from './news-text'
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
	/** The person's seat, so the power map can open their page and "See on the graph" can select it. */
	seatId?: string
	total: number
	/** Mentions this week, and per week for the last twelve weeks, oldest first. */
	thisWeek: number
	weeks: number[]
	rank: number
	latest?: { date: string; headline: string; url: string; source: string }
}

export interface PowerLink {
	fromId: string
	toId: string
	/** The relationship, read "<from> <verb> <to>": appoints, confirms, or chairs a council the other sits on. */
	verb: string
	type: 'appoints' | 'confirms' | 'chairs'
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
				seatId: node.head,
				total: 0,
				thisWeek: 0,
				weeks: Array.from({ length: 12 }, () => 0),
				rank: 0,
			}
			entry.total += 1
			const date = item.publishedAt?.slice(0, 10)
			if (date) {
				const age = Math.floor((now.getTime() - Date.parse(`${date}T00:00:00Z`)) / 86400000)
				if (age < 7) entry.thisWeek += 1
				const week = 11 - Math.floor(age / 7)
				if (week >= 0 && week < 12) entry.weeks[week] += 1
			}
			if (date && (!entry.latest || date > entry.latest.date)) {
				entry.latest = { date, headline: newsHeadline(item), url: item.url, source: item.publication }
			}
			tally.set(name, entry)
		}
	}
	const people = [...tally.values()]
		.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
		.slice(0, limit)
		.map((person, index) => ({ ...person, rank: index + 1 }))
	const shown = new Set(people.map((person) => person.nodeId))
	const links = new Map<string, PowerLink>()
	const add = (link: PowerLink) => {
		if (link.fromId !== link.toId && shown.has(link.fromId) && shown.has(link.toId)) links.set(`${link.fromId}>${link.toId}`, link)
	}
	const orgOf = (id: string) => (graph.nodes[id]?.type === 'dept_head' ? graph.nodes[id]?.parentId ?? id : id)
	for (const edge of Object.values(graph.edges)) {
		if (edge.type === 'appoints') add({ fromId: orgOf(edge.fromId), toId: orgOf(edge.toId), verb: 'appoints', type: 'appoints' })
	}
	// The Senate confirms through its presiding officer, so the Senate President carries its confirmations.
	const senatePresident = people.find((person) => person.nodeId === 'ng-senate')
	if (senatePresident) {
		for (const edge of Object.values(graph.edges)) {
			if (edge.type === 'confirms' && edge.fromId === 'ng-senate') add({ fromId: 'ng-senate', toId: orgOf(edge.toId), verb: 'confirms', type: 'confirms' })
		}
	}
	// Councils chaired ex officio whose members are other people on the map: the Vice-President chairs the
	// National Economic Council, whose members include every state governor and the CBN Governor.
	for (const edge of Object.values(graph.edges)) {
		if (edge.type !== 'ex_officio' || !shown.has(edge.fromId)) continue
		const council = graph.nodes[edge.toId]
		if (council?.id !== 'ng-national-economic-council') continue
		for (const person of people) {
			const node = graph.nodes[person.nodeId]
			if (node?.type === 'state' || node?.id === 'ng-cbn') add({ fromId: edge.fromId, toId: person.nodeId, verb: 'chairs NEC', type: 'chairs' })
		}
	}
	const edgesOut = [...links.values()]
	return { people, links: edgesOut, articles, sources: [...sources], days }
}
