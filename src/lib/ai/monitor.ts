import type { NewsItem } from '@/data/nigeria/news'
import { parseChangesFeed, parseNewsFeed } from '@/lib/graph/feed'
import type { PersonnelChange } from '@/lib/graph/types'

export interface CivicMonitorResult {
	news: NewsItem[]
	changes: PersonnelChange[]
}

export type CivicMonitorGenerate = (
	sourceText: string,
) => Promise<CivicMonitorResult>

export async function extractCivicUpdates(
	sourceText: string,
	generate: CivicMonitorGenerate,
): Promise<CivicMonitorResult> {
	const raw = await generate(sourceText)
	return {
		news: parseNewsFeed(raw.news) ?? [],
		changes: parseChangesFeed(raw.changes) ?? [],
	}
}

export function civicMonitorEnabled(
	env: NodeJS.Dict<string> = process.env,
): boolean {
	return Boolean(
		env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN || env.VERCEL === '1',
	)
}

const CIVIC_FEEDS = [
	'https://statehouse.gov.ng/feed/',
	'https://fmino.gov.ng/feed/',
]

/** Official feeds carry appointments; independent newsrooms carry who is actually in the news. */
const NEWS_FEEDS: Array<{ url: string; pages: number }> = [
	{ url: 'https://statehouse.gov.ng/feed/', pages: 15 },
	{ url: 'https://fmino.gov.ng/feed/', pages: 2 },
	{ url: 'https://www.premiumtimesng.com/feed', pages: 3 },
	{ url: 'https://punchng.com/feed/', pages: 2 },
	{ url: 'https://www.channelstv.com/feed/', pages: 3 },
	{ url: 'https://dailytrust.com/feed/', pages: 3 },
	{ url: 'https://www.vanguardngr.com/feed/', pages: 2 },
]

export async function fetchCivicSource(
	fetchImpl: typeof fetch = fetch,
): Promise<string> {
	for (const url of CIVIC_FEEDS) {
		try {
			const res = await fetchImpl(url, {
				headers: { 'user-agent': 'Govgraph/0.1' },
				cache: 'no-store',
				signal: AbortSignal.timeout(8000),
			})
			if (!res.ok) {
				continue
			}
			const text = await res.text()
			if (text.trim()) {
				return text
			}
		} catch {
			continue
		}
	}
	return ''
}

/** Every feed, several pages deep, so a daily run sees more than the latest ten posts. */
export async function fetchCivicSources(fetchImpl: typeof fetch = fetch): Promise<string[]> {
	const urls = NEWS_FEEDS.flatMap(({ url, pages }) => Array.from({ length: pages }, (_, page) => (page ? `${url}?paged=${page + 1}` : url)))
	const texts = await Promise.all(
		urls.map(async (url) => {
			try {
				const res = await fetchImpl(url, {
					headers: { 'user-agent': 'Govgraph/0.1' },
					cache: 'no-store',
					signal: AbortSignal.timeout(8000),
				})
				return res.ok ? await res.text() : ''
			} catch {
				return ''
			}
		}),
	)
	return texts.filter((text) => text.includes('<item'))
}

export async function defaultCivicGenerate(
	sourceText: string,
): Promise<CivicMonitorResult> {
	if (!civicMonitorEnabled()) {
		return { news: [], changes: [] }
	}
	const { generateObject } = await import('ai')
	const { z } = await import('zod')
	const schema = z.object({
		news: z.array(
			z.object({
				id: z.string(),
				summary: z.string(),
				url: z.string(),
				publication: z.string(),
			}),
		),
		changes: z.array(
			z.object({
				kind: z.literal('personnel'),
				id: z.string(),
				date: z.string(),
				personName: z.string(),
				positionId: z.string(),
				positionName: z.string(),
				groupId: z.string(),
				entryMode: z.enum(['appointed', 'elected', 'sworn']),
				departure: z.boolean(),
				predecessorName: z.string().nullable(),
				sourceUrl: z.string().optional(),
			}),
		),
	})
	try {
		const { object } = await generateObject({
			model: 'openai/gpt-4.1-mini',
			schema,
			prompt: `Extract only sourced Nigerian federal personnel news from this text. Invent nothing. Empty arrays if unsure.\n\n${sourceText.slice(0, 12000)}`,
		})
		return object
	} catch {
		return { news: [], changes: [] }
	}
}
