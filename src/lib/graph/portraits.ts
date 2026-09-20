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
	const names = [
		...new Set(
			Object.values(graph.nodes)
				.filter(
					(node) =>
						!node.id.startsWith('ng-senator-') &&
						!node.id.startsWith('ng-rep-'),
				)
				.flatMap((node) => node.people)
				.filter((person) => !person.imageUrl)
				.map((person) => person.name),
		),
	]
	const urls: Record<string, string> = {}
	for (const name of names) {
		const imageUrl = await wikipediaImage(name)
		if (imageUrl) {
			urls[name] = imageUrl
		}
	}
	return applyPortraitUrls(graph, urls)
}
