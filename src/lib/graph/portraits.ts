import type { CompiledGraph } from './types'

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

async function wikipediaImage(name: string) {
	const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`
	const res = await fetch(url, {
		headers: { 'user-agent': 'Govgraph/0.1 (https://ng-gov-graph.vercel.app)' },
		cache: 'no-store',
		signal: AbortSignal.timeout(4000),
	})
	if (!res.ok) {
		return null
	}
	const body = (await res.json()) as {
		originalimage?: { source?: string }
		thumbnail?: { source?: string }
	}
	return body.originalimage?.source ?? body.thumbnail?.source ?? null
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
	return applyPortraitUrls(graph, urls)
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
