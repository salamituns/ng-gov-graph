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

export async function defaultCivicGenerate(
	sourceText: string,
): Promise<CivicMonitorResult> {
	if (!process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY) {
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
	const { object } = await generateObject({
		model: 'openai/gpt-4.1-mini',
		schema,
		prompt: `Extract only sourced Nigerian federal personnel news from this text. Invent nothing. Empty arrays if unsure.\n\n${sourceText.slice(0, 12000)}`,
	})
	return object
}
