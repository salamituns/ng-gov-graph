import { DISTRICTS, STATE_SLUG, districtKey, slug } from './nass-live'
import type { OccupancyRow } from './wiki-fill'
import { applyVacantOccupancy } from './wiki-fill'
import type { CompiledGraph } from './types'

const ORDERPAPER_MEMBERS_URL =
	'https://orderpaper.ng/voter/10th-national-assembly-members'
const ORDERPAPER_HOUSE_URLS = [
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Gwacham-Maureen-Chinwe-1379',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Midala-Usman-Balami-1626',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Aluko-Ahmed-Yinka-2916',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Amadi-Blessing-Chigeru-3755',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Ibrahim-Mohammed-4032',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Idris-Salman-2841',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Rabiu-Garba-Kamba-2752',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Jallo-Hussaini-Mohammed-2370',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Aliyu-Mustapha-Abdullahi-2378',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Muhammad-Aminu-Ibrahim-4030',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Hassan-Bala-Abubakar--4055',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Mohammed-Garba-Ibrahim-2554',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Shehu-Muhammad-Bello-2533',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Yusuf-Rabiu-2638',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Koki-Sagir-Ibrahim-2604',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Mu%27azo--Abdullahi-Gwarzo-2560',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Hassan-Mohammed-Danjuma-4027',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Mustapha-Tijjani-Ghali-2471',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Muhammed-Dan-Abba-Shehu-1483',
	'https://orderpaper.ng/voter/10th-national-assembly-member?id=Musa-Garba-Maidoki-608',
]

const PARTY: Record<string, string> = {
	'peoples democratic party': 'PDP',
	'all progressives congress': 'APC',
	'labour party': 'LP',
	'all progressive grand alliance': 'APGA',
	'all progressives grand alliance': 'APGA',
	'african democratic congress': 'ADC',
	'new nigeria peoples party': 'NNPP',
	'social democratic party': 'SDP',
	'young progressive party': 'YPP',
	'young progressives party': 'YPP',
	'peoples redemption party': 'PRP',
	'allied peoples movement': 'APM',
	accord: 'Accord',
	'all progressive congress': 'APC',
}

function htmlToMarkdown(source: string) {
	if (!/<h3[\s>]/i.test(source) && !/<html/i.test(source)) {
		return source
	}
	return source
		.replace(/<h3[^>]*>/gi, '\n### ')
		.replace(/<\/h3>/gi, '\n')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n')
		.replace(/<strong[^>]*>/gi, '**')
		.replace(/<\/strong>/gi, '**')
		.replace(/<a[^>]*>/gi, '')
		.replace(/<\/a>/gi, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/[ \t]+/g, ' ')
}

function pushRow(rows: OccupancyRow[], seen: Set<string>, row: OccupancyRow) {
	if (seen.has(row.id)) {
		return
	}
	seen.add(row.id)
	rows.push(row)
}

function partyCode(value: string) {
	const cleaned = value.replace(/\s+/g, ' ').trim()
	return PARTY[cleaned.toLowerCase()] ?? cleaned
}

function stateKey(raw: string) {
	const cleaned = raw.replace(/\./g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
	if (cleaned === 'f c t' || cleaned === 'fct') {
		return 'fct'
	}
	return STATE_SLUG[cleaned] ?? (DISTRICTS[slug(cleaned)] ? slug(cleaned) : null)
}

function senatorSeatId(stateSlug: string, districtLine: string) {
	const district = districtKey(
		stateSlug,
		districtLine.replace(/\s*district$/i, ''),
	)
	if (stateSlug === 'fct') {
		return 'ng-senator-fct'
	}
	if (!(DISTRICTS[stateSlug] ?? []).includes(district)) {
		return null
	}
	return `ng-senator-${stateSlug}-${district}`
}

export function parseOrderpaperMembers(source: string): OccupancyRow[] {
	const text = htmlToMarkdown(source)
	const rows: OccupancyRow[] = []
	const seen = new Set<string>()
	const cards = [
		...text.matchAll(
			/### \[((?:Sen|Hon|Rep)\.?)\s+([^\]]+)\]\([^)]+\)\s*\n+([^\n]+)/g,
		),
	]
	for (const match of cards) {
		const kind = match[1].toLowerCase()
		const name = match[2].replace(/\s+/g, ' ').trim()
		const place = match[3].replace(/\s+/g, ' ').trim()
		const comma = place.lastIndexOf(',')
		if (comma < 0 || !name) {
			continue
		}
		const locale = place.slice(comma + 1).trim()
		const office = place.slice(0, comma).trim()
		const state = stateKey(locale)
		if (!state) {
			continue
		}
		const after = text.slice((match.index ?? 0) + match[0].length)
		const until = after.split(/### \[/)[0]
		const partyLine = until
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith('!['))
			.at(-1)
		const party = partyLine ? partyCode(partyLine) : undefined
		if (kind.startsWith('sen')) {
			const id = senatorSeatId(state, office)
			if (!id) {
				continue
			}
			pushRow(rows, seen, { id, name, party })
			continue
		}
		pushRow(rows, seen, {
			id: `ng-rep-${state}-${slug(office.replace(/federal constituency|constituency/gi, ''))}`,
			name,
			party,
		})
	}
	for (const match of text.matchAll(
		/###\s+Sen\.?\s+([^\n[]+)\n[\s\S]*?\*\*District:\s*\*\*\s*([^\n]+)\n[\s\S]*?\*\*Party:\s*\*\*\s*([^\n]+)/gi,
	)) {
		const name = match[1].replace(/\s+/g, ' ').trim()
		const place = match[2].replace(/\s+/g, ' ').trim()
		const comma = place.lastIndexOf(',')
		if (comma < 0 || !name) {
			continue
		}
		const state = stateKey(place.slice(comma + 1).trim())
		if (!state) {
			continue
		}
		const id = senatorSeatId(state, place.slice(0, comma).trim())
		if (!id) {
			continue
		}
		pushRow(rows, seen, { id, name, party: partyCode(match[3]) })
	}
	for (const match of text.matchAll(
		/###\s+Hon\.?\s+([^\n[]+)\n[\s\S]*?\*\*Constituency:\s*\*\*\s*([^\n]+)\n[\s\S]*?\*\*Party:\s*\*\*\s*([^\n]+)/gi,
	)) {
		const name = match[1].replace(/\s+/g, ' ').trim()
		const place = match[2].replace(/\s+/g, ' ').trim()
		const comma = place.lastIndexOf(',')
		if (comma < 0 || !name) {
			continue
		}
		const state = stateKey(place.slice(comma + 1).trim())
		if (!state) {
			continue
		}
		pushRow(rows, seen, {
			id: `ng-rep-${state}-${slug(place.slice(0, comma).replace(/federal constituency|constituency/gi, ''))}`,
			name,
			party: partyCode(match[3]),
		})
	}
	return rows
}

export async function overlayOrderpaperOccupancy(
	graph: CompiledGraph,
): Promise<CompiledGraph> {
	const headers = {
		'user-agent': 'Govgraph/0.1 (https://ng-gov-graph.vercel.app)',
	}
	const pages = await Promise.all(
		[ORDERPAPER_MEMBERS_URL, ...ORDERPAPER_HOUSE_URLS].map((url) =>
			fetch(url, { headers, cache: 'no-store' })
				.then((res) => (res.ok ? res.text() : ''))
				.catch(() => ''),
		),
	)
	return applyVacantOccupancy(graph, parseOrderpaperMembers(pages.join('\n')))
}
