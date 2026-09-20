import type { CompiledGraph, Officeholder } from './types'

const NASS = 'https://nass.gov.ng/mps/get_legislators/'

export const DISTRICTS: Record<string, string[]> = {
	abia: ['north', 'south', 'central'],
	adamawa: ['north', 'south', 'central'],
	'akwa-ibom': ['north-east', 'north-west', 'south'],
	anambra: ['north', 'south', 'central'],
	bauchi: ['north', 'south', 'central'],
	bayelsa: ['east', 'west', 'central'],
	benue: ['north-east', 'north-west', 'south'],
	borno: ['north', 'south', 'central'],
	'cross-river': ['north', 'south', 'central'],
	delta: ['north', 'south', 'central'],
	ebonyi: ['north', 'south', 'central'],
	edo: ['north', 'south', 'central'],
	ekiti: ['north', 'south', 'central'],
	enugu: ['east', 'west', 'north'],
	gombe: ['north', 'south', 'central'],
	imo: ['east', 'west', 'north'],
	jigawa: ['north-east', 'north-west', 'south-west'],
	kaduna: ['north', 'south', 'central'],
	kano: ['north', 'south', 'central'],
	katsina: ['north', 'south', 'central'],
	kebbi: ['north', 'south', 'central'],
	kogi: ['east', 'west', 'central'],
	kwara: ['north', 'south', 'central'],
	lagos: ['east', 'west', 'central'],
	nasarawa: ['north', 'south', 'west'],
	niger: ['east', 'north', 'south'],
	ogun: ['east', 'west', 'central'],
	ondo: ['north', 'south', 'central'],
	osun: ['east', 'west', 'central'],
	oyo: ['north', 'south', 'central'],
	plateau: ['north', 'south', 'central'],
	rivers: ['east', 'west', 'south-east'],
	sokoto: ['north', 'east', 'south'],
	taraba: ['north', 'south', 'central'],
	yobe: ['north', 'south', 'east'],
	zamfara: ['west', 'central', 'north'],
	fct: ['fct'],
}

export const STATE_SLUG: Record<string, string> = {
	abia: 'abia',
	adamawa: 'adamawa',
	'akwa ibom': 'akwa-ibom',
	anambra: 'anambra',
	bauchi: 'bauchi',
	bayelsa: 'bayelsa',
	benue: 'benue',
	borno: 'borno',
	'cross river': 'cross-river',
	delta: 'delta',
	ebonyi: 'ebonyi',
	edo: 'edo',
	ekiti: 'ekiti',
	enugu: 'enugu',
	gombe: 'gombe',
	imo: 'imo',
	jigawa: 'jigawa',
	kaduna: 'kaduna',
	kano: 'kano',
	katsina: 'katsina',
	kebbi: 'kebbi',
	kogi: 'kogi',
	kwara: 'kwara',
	lagos: 'lagos',
	nasarawa: 'nasarawa',
	nassarawa: 'nasarawa',
	niger: 'niger',
	ogun: 'ogun',
	ondo: 'ondo',
	osun: 'osun',
	oyo: 'oyo',
	plateau: 'plateau',
	rivers: 'rivers',
	sokoto: 'sokoto',
	taraba: 'taraba',
	yobe: 'yobe',
	zamfara: 'zamfara',
	'federal capital territory': 'fct',
	fct: 'fct',
}

export function slug(value: string) {
	return value
		.toLowerCase()
		.replace(/[–—]/g, '-')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
}

export function districtKey(stateSlug: string, district: string) {
	let key = district.toLowerCase().replace(/nassarawa/g, 'nasarawa')
	for (const token of [stateSlug.replace(/-/g, ' '), ...stateSlug.split('-')]) {
		if (key.startsWith(token)) {
			key = key.slice(token.length).trim()
		}
	}
	key = slug(key.replace('senatorial district', ''))
	const aliases: Record<string, string> = {
		northwest: 'north-west',
		northeast: 'north-east',
		southeast: 'south-east',
		southwest: 'south-west',
	}
	key = aliases[key] ?? key
	return stateSlug === 'fct' ? 'fct' : key
}

function officeholder(
	name: string,
	party: string,
	memberId: string,
): Officeholder | null {
	const cleaned = name.replace(/^(Sen\.|Hon\.)\s*/i, '').replace(/\s+/g, ' ').trim()
	if (!cleaned) {
		return null
	}
	return {
		name: cleaned,
		appointedYear: 2023,
		party: party.trim() || undefined,
		imageUrl: memberId
			? `https://nass.gov.ng/themes/newnass/images/mps/${memberId}.jpg`
			: undefined,
	}
}

async function fetchChamber(chamber: 1 | 2): Promise<string[][]> {
	const url = `${NASS}?chamber=${chamber}&draw=1&start=0&length=400`
	const res = await fetch(url, {
		headers: { 'user-agent': 'Govgraph/0.1' },
		cache: 'no-store',
	})
	if (!res.ok) {
		throw new Error(`NASS chamber ${chamber} returned ${res.status}`)
	}
	const body = (await res.json()) as { data: string[][] }
	return body.data
}

export async function overlayNassOccupancy(
	graph: CompiledGraph,
): Promise<CompiledGraph> {
	const senate = await fetchChamber(1)
	const house = await fetchChamber(2)
	for (const [name, state, district, party, memberId] of senate) {
		const stateSlug = STATE_SLUG[state.trim().toLowerCase()]
		if (!stateSlug) {
			continue
		}
		const key = districtKey(stateSlug, district)
		if (!DISTRICTS[stateSlug]?.includes(key)) {
			continue
		}
		const id =
			stateSlug === 'fct' ? 'ng-senator-fct' : `ng-senator-${stateSlug}-${key}`
		const person = officeholder(name, party, memberId)
		if (graph.nodes[id] && person) {
			graph.nodes[id].people = [person]
		}
	}
	const seen = new Set<string>()
	for (const [name, state, constituency, party, memberId] of house) {
		const stateSlug = STATE_SLUG[state.trim().toLowerCase()]
		if (!stateSlug) {
			continue
		}
		const constName = constituency
			.replace(/\s+/g, ' ')
			.replace(/\s*federal constituency\.?$/i, '')
			.trim()
		const id = `ng-rep-${stateSlug}-${slug(constName)}`
		if (seen.has(id)) {
			continue
		}
		seen.add(id)
		const person = officeholder(name, party, memberId)
		if (graph.nodes[id] && person) {
			graph.nodes[id].people = [person]
		}
	}
	return graph
}
