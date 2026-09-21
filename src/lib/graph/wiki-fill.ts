import { DISTRICTS, districtKey, slug } from './nass-live'
import type { CompiledGraph } from './types'

export interface OccupancyRow {
	id: string
	name: string
	party?: string
}

const CODE: Record<string, string> = {
	c: 'central',
	n: 'north',
	s: 'south',
	e: 'east',
	w: 'west',
	ne: 'north-east',
	nw: 'north-west',
	se: 'south-east',
	sw: 'south-west',
	fct: 'fct',
}

const STATE_PAGE: Record<string, string> = {
	'akwa-ibom': 'Akwa_Ibom',
	'cross-river': 'Cross_River',
	fct: 'the_Federal_Capital_Territory',
}

function titleCaseState(stateSlug: string) {
	return stateSlug
		.split('-')
		.map((part) => part[0]?.toUpperCase() + part.slice(1))
		.join('_')
}

function wikilinkName(value: string) {
	const link = value.match(/\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]/)
	const raw = (link ? link[1] : value)
		.replace(/'{2,}/g, '')
		.replace(/<[^>]+>/g, '')
		.trim()
	return raw.split('|').at(-1)?.trim() ?? raw
}

function partyCode(value: string) {
	const link = value.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/)
	if (link) {
		return (link[2] ?? link[1]).trim()
	}
	const paren = value.match(/\(([A-Z]{2,5})\)/)
	return (paren?.[1] ?? value.replace(/[^A-Za-z]/g, '')).trim()
}

function senatorId(stateSlug: string, district: string) {
	return stateSlug === 'fct'
		? 'ng-senator-fct'
		: `ng-senator-${stateSlug}-${district}`
}

function nextUnused(stateSlug: string, used: Set<string>, preferred?: string) {
	const options = DISTRICTS[stateSlug] ?? []
	if (preferred && options.includes(preferred) && !used.has(preferred)) {
		return preferred
	}
	return options.find((item) => !used.has(item))
}

export function parseSenateTemplate(wikitext: string): OccupancyRow[] {
	const rows: OccupancyRow[] = []
	const groups = [
		...wikitext.matchAll(
			/delegation from ([^\|\]]+)\|[\s\S]*?\|list\d+\s*=([\s\S]*?)(?=\n\|group\d+|\n\|col\d+|\n\}\}|$)/gi,
		),
	]
	for (const match of groups) {
		const stateSlug = slug(match[1])
		const used = new Set<string>()
		const lines = [...match[2].matchAll(/\*[^\n]+/g)].map((item) => item[0])
		const parsedLines = lines
			.map((line) =>
				line.match(
					/(C|N|S|E|W|NE|NW|SE|SW|FCT)\]*:\s*(?:'{2,})?\[\[([^\]]+)\]\](?:'{2,})?\s*\(([^)]+)\)/i,
				),
			)
			.filter((item): item is RegExpMatchArray => Boolean(item))
		const sameCode =
			parsedLines.length > 1 &&
			parsedLines.every((item) => item[1] === parsedLines[0][1])
		for (const parsed of parsedLines) {
			const name = wikilinkName(`[[${parsed[2]}]]`)
			const party = parsed[3].trim()
			if (!name || name.toUpperCase() === 'TBD' || party.toUpperCase() === 'TBD') {
				continue
			}
			const preferred = sameCode ? undefined : CODE[parsed[1].toLowerCase()]
			const district = nextUnused(stateSlug, used, preferred)
			if (!district) {
				continue
			}
			used.add(district)
			rows.push({
				id: senatorId(stateSlug, district),
				name,
				party,
			})
		}
	}
	return rows
}

function tenthSection(wikitext: string) {
	const start = wikitext.search(/===+\s*10th Assembly/i)
	if (start < 0) {
		return ''
	}
	const rest = wikitext.slice(start)
	const end = rest.search(/\n==[^=]/)
	return end < 0 ? rest : rest.slice(0, end)
}

function tableChunks(section: string) {
	return section.split(/\n\|-/).slice(1)
}

export function parseDelegationTenthAssembly(
	wikitext: string,
	stateSlug: string,
): OccupancyRow[] {
	const section = tenthSection(wikitext)
	const rows: OccupancyRow[] = []
	let kind: 'senator' | 'rep' | null = null
	for (const chunk of tableChunks(section)) {
		if (/!/.test(chunk) && /Senator/i.test(chunk) && /Constituency/i.test(chunk)) {
			kind = 'senator'
			continue
		}
		if (/!/.test(chunk) && /Representative/i.test(chunk)) {
			kind = 'rep'
			continue
		}
		const cells = [...chunk.matchAll(/^\s*\|(.*)$/gm)].map((item) => item[1].trim())
		if (cells.length < 3 || !kind) {
			continue
		}
		const name = wikilinkName(cells[0])
		const party = partyCode(cells[1])
		const constituency = wikilinkName(cells[2])
		if (!name || name.toUpperCase() === 'TBD' || /^-+$/.test(name)) {
			continue
		}
		if (kind === 'senator') {
			const district = districtKey(stateSlug, constituency)
			const mapped =
				(DISTRICTS[stateSlug] ?? []).includes(district)
					? district
					: nextUnused(stateSlug, new Set(rows.filter((row) => row.id.startsWith('ng-senator-')).map((row) => row.id.split('-').at(-1) ?? '')))
			if (!mapped) {
				continue
			}
			rows.push({
				id: senatorId(stateSlug, mapped),
				name,
				party,
			})
			continue
		}
		rows.push({
			id: `ng-rep-${stateSlug}-${slug(constituency.replace(/federal constituency/i, ''))}`,
			name,
			party,
		})
	}
	return rows
}

export function parseHouseMembersList(wikitext: string): OccupancyRow[] {
	const rows: OccupancyRow[] = []
	let stateSlug = ''
	for (const chunk of wikitext.split(/\n\|-\n/)) {
		const state = chunk.match(/delegation from ([^\|\]]+)\|/)
		if (state) {
			stateSlug = slug(state[1])
		}
		if (!stateSlug) {
			continue
		}
		const constituency = chunk.match(
			/align="center"\s*\|(?:\[\[[^\|\]]+\|)?([^\|\n\]]+)/,
		)
		const named =
			chunk.match(/\{\{sortname\|([^|}]+)\|([^|}]+)\|([^|}]+)\}\}/i) ??
			chunk.match(/\{\{sortname\|([^|}]+)\|([^|}]+)\}\}/i)
		if (!constituency || !named) {
			continue
		}
		const name = (named[3] ?? `${named[1]} ${named[2]}`).trim()
		if (!name || /tbd|vacant/i.test(name)) {
			continue
		}
		const party = chunk.match(
			/\[\[(?:[^\|\]]+\|)?(PDP|APC|LP|NNPP|APGA|ADC|SDP|YPP|PRP|APM)\]\]/,
		)
		rows.push({
			id: `ng-rep-${stateSlug}-${slug(constituency[1].replace(/federal constituency/i, ''))}`,
			name,
			party: party?.[1],
		})
	}
	return rows
}

function resolveSeatId(graph: CompiledGraph, id: string) {
	if (graph.nodes[id]) {
		return id
	}
	if (!id.startsWith('ng-rep-')) {
		return null
	}
	const states = Object.keys(DISTRICTS).sort((a, b) => b.length - a.length)
	for (const state of states) {
		const prefix = `ng-rep-${state}-`
		if (!id.startsWith(prefix)) {
			continue
		}
		const rest = id.slice(prefix.length)
		const hits = Object.keys(graph.nodes).filter((nodeId) => {
			if (!nodeId.startsWith(prefix) || graph.nodes[nodeId].people.length > 0) {
				return false
			}
			const seat = nodeId.slice(prefix.length)
			if (seat.startsWith('unlisted-')) {
				return false
			}
			return seat === rest || seat.includes(rest) || rest.includes(seat)
		})
		if (hits.length === 1) {
			return hits[0]
		}
		const unlisted = Object.keys(graph.nodes).find(
			(nodeId) =>
				nodeId.startsWith(`${prefix}unlisted-`) &&
				graph.nodes[nodeId].people.length === 0,
		)
		return unlisted ?? null
	}
	return null
}

function nameTokens(value: string) {
	return slug(value).split('-').filter((token) => token.length > 2)
}

const COMMON_NAME_TOKENS = new Set([
	'mohammed',
	'muhammad',
	'abdullahi',
	'ibrahim',
	'abubakar',
	'mustapha',
	'ahmed',
	'sani',
	'usman',
	'aliyu',
	'yusuf',
	'hassan',
	'suleiman',
	'garba',
	'bello',
	'shehu',
	'ali',
])

function namesOverlap(left: string, right: string) {
	const a = nameTokens(left)
	const b = new Set(nameTokens(right))
	const shared = a.filter((token) => b.has(token))
	const distinctive = shared.filter(
		(token) => token.length >= 7 && !COMMON_NAME_TOKENS.has(token),
	)
	return distinctive.length > 0 || (
		shared.length >= 2 && shared.some((token) => !COMMON_NAME_TOKENS.has(token))
	)
}

function alreadyHeldInState(
	graph: CompiledGraph,
	rowId: string,
	name: string,
) {
	if (!rowId.startsWith('ng-rep-')) {
		return false
	}
	const state = Object.keys(DISTRICTS)
		.sort((a, b) => b.length - a.length)
		.find((item) => rowId.startsWith(`ng-rep-${item}-`))
	if (!state) {
		return false
	}
	const prefix = `ng-rep-${state}-`
	return Object.values(graph.nodes).some(
		(node) =>
			node.id.startsWith(prefix) &&
			node.people[0]?.name &&
			namesOverlap(node.people[0].name, name),
	)
}

export function applyVacantOccupancy(
	graph: CompiledGraph,
	rows: OccupancyRow[],
): CompiledGraph {
	for (const row of rows) {
		if (alreadyHeldInState(graph, row.id, row.name)) {
			continue
		}
		const seatId = resolveSeatId(graph, row.id)
		if (seatId === null) {
			continue
		}
		const node = graph.nodes[seatId]
		if (!node || node.people.length > 0) {
			continue
		}
		if (seatId.includes('-unlisted-')) {
			const state = Object.keys(DISTRICTS)
				.sort((a, b) => b.length - a.length)
				.find((item) => row.id.startsWith(`ng-rep-${item}-`))
			if (state) {
				const label = row.id.slice(`ng-rep-${state}-`.length).replace(/-/g, ' ')
				node.name = `Representative for ${label}`
			}
		}
		node.people = [
			{
				name: row.name,
				appointedYear: 2023,
				party: row.party,
			},
		]
	}
	return graph
}

async function fetchWikitext(page: string) {
	const url = new URL('https://en.wikipedia.org/w/api.php')
	url.searchParams.set('action', 'parse')
	url.searchParams.set('page', page)
	url.searchParams.set('prop', 'wikitext')
	url.searchParams.set('format', 'json')
	const res = await fetch(url, {
		headers: { 'user-agent': 'Govgraph/0.1 (https://ng-gov-graph.vercel.app)' },
		cache: 'no-store',
	})
	if (!res.ok) {
		return ''
	}
	const body = (await res.json()) as {
		parse?: { wikitext?: { '*': string } }
	}
	return body.parse?.wikitext?.['*'] ?? ''
}

export async function overlayWikiOccupancy(
	graph: CompiledGraph,
): Promise<CompiledGraph> {
	const senate = await fetchWikitext(
		'Template:Nigerian_senators_of_the_10th_National_Assembly',
	)
	applyVacantOccupancy(graph, parseSenateTemplate(senate))
	const houseList = await fetchWikitext(
		'List_of_members_of_the_House_of_Representatives_of_Nigeria,_2023–2027',
	)
	applyVacantOccupancy(graph, parseHouseMembersList(houseList))
	for (const stateSlug of Object.keys(DISTRICTS)) {
		const page = `Nigerian_National_Assembly_delegation_from_${STATE_PAGE[stateSlug] ?? titleCaseState(stateSlug)}`
		const text = await fetchWikitext(page)
		if (!text) {
			continue
		}
		applyVacantOccupancy(graph, parseDelegationTenthAssembly(text, stateSlug))
	}
	return graph
}
