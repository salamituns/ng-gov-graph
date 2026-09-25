import type { CompiledGraph } from './types'

/** Wikimedia serves standard widths (250, 330, 500 …) from a thumb URL; an avatar never needs the 3840px original. */
export function portraitSize(url: string, width = 500) {
	if (!/upload\.wikimedia\.org|thumb\.wikimedia\.org/.test(url)) return url
	// Only ever shrink: a thumbnail wider than the original file is an error.
	return url.replace(/\/(\d{2,4})px-/, (match, current: string) => (Number(current) > width ? `/${width}px-` : match))
}

export function applyPortraitUrls(
	graph: CompiledGraph,
	urls: Record<string, string>,
): CompiledGraph {
	for (const node of Object.values(graph.nodes)) {
		node.people = node.people.map((person) => {
			if (person.imageUrl) {
				return person
			}
			const imageUrl = urls[person.name]
			return imageUrl ? { ...person, imageUrl } : person
		})
	}
	return graph
}

const WIKI_HEADERS = { 'user-agent': 'Govgraph/0.1 (https://ng-gov-graph.vercel.app)' }

function nameTokens(name: string) {
	return name
		.toLowerCase()
		.replace(/\b(?:dr|prof|mr|mrs|ms|engr|alhaji|hajiya|chief|senator|sen|hon|barr|arc|rtd)\.?\s+/g, '')
		.split(/[\s.'’-]+/)
		.filter((token) => token.length > 1)
}

/**
 * A search result is the person when its title shares two parts of the name, or the surname and the
 * first initial, and the page is about someone Nigerian. A wrong face is worse than none.
 */
export function isSamePerson(name: string, title: string, about: string) {
	const wanted = nameTokens(name)
	const found = nameTokens(title.replace(/\s*\([^)]*\)\s*/g, ' '))
	// First and last names must line up: "Ali Muhammad Ali" is not "Muhammad Ali Pate".
	const first = (list: string[]) => list[0]
	const last = (list: string[]) => list.at(-1)
	const matches =
		found.length >= 2 &&
		last(found) === last(wanted) &&
		(first(found) === first(wanted) || (first(found)?.length === 1 && first(found) === first(wanted)?.[0]))
	return matches && /Nigeria/i.test(about)
}

async function wikipediaImage(name: string) {
	const url = new URL('https://en.wikipedia.org/w/api.php')
	url.searchParams.set('action', 'query')
	url.searchParams.set('format', 'json')
	url.searchParams.set('generator', 'search')
	url.searchParams.set('gsrsearch', `${name} Nigeria`)
	url.searchParams.set('gsrlimit', '4')
	url.searchParams.set('prop', 'pageimages|description|extracts')
	url.searchParams.set('piprop', 'original|thumbnail')
	url.searchParams.set('pithumbsize', '500')
	url.searchParams.set('exintro', '1')
	url.searchParams.set('explaintext', '1')
	url.searchParams.set('exsentences', '2')
	url.searchParams.set('redirects', '1')
	const res = await fetch(url, { headers: WIKI_HEADERS, cache: 'no-store', signal: AbortSignal.timeout(6000) })
	if (!res.ok) return null
	const body = (await res.json()) as {
		query?: { pages?: Record<string, { index?: number; title: string; description?: string; extract?: string; thumbnail?: { source?: string }; original?: { source?: string } }> }
	}
	const pages = Object.values(body.query?.pages ?? {}).sort((a, b) => (a.index ?? 9) - (b.index ?? 9))
	const page = pages.find((candidate) => isSamePerson(name, candidate.title, `${candidate.description ?? ''} ${candidate.extract ?? ''}`))
	const image = page?.thumbnail?.source ?? page?.original?.source ?? null
	// A lead image of two people ("Pantami and Abdullahi") is not a portrait of either.
	return image && !/(?:[_-]and[_-]|[_-]with[_-])/i.test(decodeURIComponent(image)) ? portraitSize(image) : null
}

/** File names and captions of event photos, group shots and stand-ins rather than a portrait. */
const NOT_A_PORTRAIT = /\b(?:and|with|group|visit|courtesy|forum|meeting|summit|event|ceremony|delegation|receives|dummy|default|saveclip|screenshot|flyer|poster)\b/i

/** Official Nigerian domains only: a ministry, agency, legislature or public university site. */
const OFFICIAL_HOST = /(?:\.gov\.ng|\.org\.ng|\.edu\.ng|\.mil\.ng|^nass\.gov\.ng)$/i

function surnameOf(name: string) {
	return nameTokens(name).at(-1) ?? ''
}

/**
 * Finds the person's photo on an official page: an image whose alt text, title or file name carries
 * the surname. Logos, banners and group photos without the name are ignored.
 */
export function officialImage(html: string, pageUrl: string, name: string): string | null {
	const surname = surnameOf(name)
	if (surname.length < 3) return null
	const first = nameTokens(name)[0] ?? ''
	const plain = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ')
	let best: { url: string; score: number } | null = null
	for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
		const attr = (key: string) => tag.match(new RegExp(`\\b${key}=["']([^"']+)["']`, 'i'))?.[1] ?? ''
		const src = attr('data-src') || attr('data-lazy-src') || attr('src') || attr('srcset').split(/\s+/)[0]
		if (!src || /logo|icon|banner|sprite|placeholder|avatar-default|\.svg/i.test(src)) continue
		const file = plain(decodeURIComponent(src.split('/').pop() ?? ''))
		if (NOT_A_PORTRAIT.test(file)) continue
		const caption = plain(`${attr('alt')} ${attr('title')}`).trim()
		const inFile = file.split(' ').includes(surname)
		// A name caption ("Dr Jane Doe, Director-General") is a portrait; an event caption is not.
		const inCaption = caption.split(' ').includes(surname) && caption.split(' ').length <= 8 && !NOT_A_PORTRAIT.test(caption)
		if (!inFile && !inCaption) continue
		const score = (inFile ? 3 : 2) + (first && `${file} ${caption}`.split(' ').includes(first) ? 1 : 0)
		try {
			const url = new URL(src, pageUrl).toString()
			if (!/^https:/.test(url)) continue
			if (!best || score > best.score) best = { url, score }
		} catch {
			continue
		}
	}
	return best?.url ?? null
}

/** "Gen. Christopher G. Musa (rtd)" and "Christopher Gwabin Musa" are the same minister: first and last name. */
export function personKey(name: string) {
	const tokens = nameTokens(name.replace(/\b(?:gen|maj|col|brig|air|vice|marshal|rear|admiral|rtd)\b\.?/gi, ' '))
	return `${tokens[0] ?? ''}|${tokens.at(-1) ?? ''}`
}

const CABINET_URL = 'https://statehouse.gov.ng/the-cabinet/'

/** The State House cabinet table links every minister's row to the ministry's own website. */
export function cabinetSites(html: string): Map<string, string> {
	const sites = new Map<string, string>()
	for (const row of html.match(/<tr[^>]*data-href=["'][^"']+["'][^>]*>[\s\S]*?<\/tr>/gi) ?? []) {
		const href = row.match(/data-href=["']([^"']+)["']/i)?.[1]
		const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cell[1].replace(/<[^>]+>/g, '').trim())
		const name = cells.at(-1)?.replace(/\([^)]*\)/g, '').replace(/,.*$/, '').trim()
		if (href && name) sites.set(personKey(name), href)
	}
	return sites
}

async function officialPortraits(graph: CompiledGraph, names: Set<string>) {
	const pages = new Map<string, Promise<string>>()
	const page = (url: string) => {
		if (!pages.has(url)) {
			pages.set(url, fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Govgraph)' }, signal: AbortSignal.timeout(15000) })
				.then((res) => (res.ok ? res.text() : ''))
				.catch(() => ''))
		}
		return pages.get(url)!
	}
	const ministrySites = await cabinetSites(await page(CABINET_URL))
	const found: Record<string, string> = {}
	const tasks: Array<() => Promise<void>> = []
	for (const node of Object.values(graph.nodes)) {
		const person = node.people[0]
		if (!person || !names.has(person.name) || person.imageUrl) continue
		const org = node.type === 'dept_head' && node.parentId ? graph.nodes[node.parentId] : node
		const official = (url?: string) => {
			try {
				return Boolean(url) && OFFICIAL_HOST.test(new URL(url!).hostname)
			} catch {
				return false
			}
		}
		// The body's curated website is trusted whatever its domain; other pages must be official.
		const candidates = [
			official(person.sourceUrl) ? person.sourceUrl : undefined,
			org?.officialUrl && !/statehouse\.gov\.ng\/the-cabinet/.test(org.officialUrl) ? org.officialUrl : undefined,
			ministrySites.get(personKey(person.name)),
		].filter((url): url is string => Boolean(url))
		for (const url of candidates) {
			tasks.push(async () => {
				if (found[person.name]) return
				const image = officialImage(await page(url), url, person.name)
				if (image) found[person.name] = image
			})
		}
	}
	let cursor = 0
	await Promise.all(Array.from({ length: 8 }, async () => {
		while (cursor < tasks.length) await tasks[cursor++]()
	}))
	return found
}

export async function overlayPortraits(
	graph: CompiledGraph,
): Promise<CompiledGraph> {
	const known: Record<string, string> = {}
	for (const node of Object.values(graph.nodes)) {
		for (const person of node.people) {
			if (person.imageUrl) {
				known[person.name] = person.imageUrl
			}
		}
	}
	applyPortraitUrls(graph, known)
	const urls = await mapPortraitUrls(portraitTargets(graph), async (name) => {
		try {
			return await wikipediaImage(name)
		} catch {
			return null
		}
	})
	applyPortraitUrls(graph, urls)
	// Officials without a Wikipedia photo usually have one on their own agency's site.
	return applyPortraitUrls(graph, await officialPortraits(graph, new Set(portraitTargets(graph))))
}

export function portraitTargets(graph: CompiledGraph): string[] {
	const known = new Set<string>()
	const missing = new Set<string>()
	for (const node of Object.values(graph.nodes)) {
		if (node.id.startsWith('ng-senator-') || node.id.startsWith('ng-rep-')) {
			continue
		}
		for (const person of node.people) {
			if (!person.name) {
				continue
			}
			if (person.imageUrl) {
				known.add(person.name)
			} else {
				missing.add(person.name)
			}
		}
	}
	return [...missing].filter((name) => !known.has(name))
}

export async function mapPortraitUrls(
	names: string[],
	lookup: (name: string) => Promise<string | null>,
	options?: { concurrency?: number },
): Promise<Record<string, string>> {
	const urls: Record<string, string> = {}
	const concurrency = Math.max(1, options?.concurrency ?? 6)
	let cursor = 0
	async function worker() {
		while (cursor < names.length) {
			const index = cursor
			cursor += 1
			const name = names[index]
			if (!name) {
				continue
			}
			const imageUrl = await lookup(name)
			if (imageUrl) {
				urls[name] = imageUrl
			}
		}
	}
	await Promise.all(
		Array.from({ length: Math.min(concurrency, names.length) }, () => worker()),
	)
	return urls
}
