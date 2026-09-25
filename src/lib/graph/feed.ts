import type { NewsItem } from '@/data/nigeria/news'
import { mentionedIds, usableEntityLabel, type MentionLabel } from './mentions'
import { decodeHtml } from './news-text'
import type { PersonnelChange } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseNewsFeed(value: unknown): NewsItem[] | null {
	if (!Array.isArray(value)) {
		return null
	}
	const items: NewsItem[] = []
	for (const entry of value) {
		if (!isRecord(entry)) {
			return null
		}
		if (
			typeof entry.id !== 'string' ||
			typeof entry.summary !== 'string' ||
			typeof entry.url !== 'string' ||
			typeof entry.publication !== 'string'
		) {
			return null
		}
		items.push({
			id: entry.id,
			summary: entry.summary,
			excerpt: typeof entry.excerpt === 'string' ? entry.excerpt : undefined,
			url: entry.url,
			publication: entry.publication,
			publishedAt: typeof entry.publishedAt === 'string' ? entry.publishedAt : undefined,
			imageUrl: typeof entry.imageUrl === 'string' ? entry.imageUrl : undefined,
			entityIds: Array.isArray(entry.entityIds)
				? entry.entityIds.filter((id): id is string => typeof id === 'string')
				: undefined,
		})
	}
	return items
}

export function parseChangesFeed(value: unknown): PersonnelChange[] | null {
	if (!Array.isArray(value)) {
		return null
	}
	const items: PersonnelChange[] = []
	for (const entry of value) {
		if (!isRecord(entry)) {
			return null
		}
		if (
			entry.kind !== 'personnel' ||
			typeof entry.id !== 'string' ||
			typeof entry.date !== 'string' ||
			typeof entry.personName !== 'string' ||
			typeof entry.positionId !== 'string' ||
			typeof entry.positionName !== 'string' ||
			typeof entry.groupId !== 'string' ||
			typeof entry.departure !== 'boolean'
		) {
			return null
		}
		if (
			entry.entryMode !== 'appointed' &&
			entry.entryMode !== 'elected' &&
			entry.entryMode !== 'sworn'
		) {
			return null
		}
		items.push({
			kind: 'personnel',
			id: entry.id,
			date: entry.date,
			personName: entry.personName,
			positionId: entry.positionId,
			positionName: entry.positionName,
			groupId: entry.groupId,
			entryMode: entry.entryMode,
			departure: entry.departure,
			predecessorName:
				typeof entry.predecessorName === 'string' ? entry.predecessorName : null,
			sourceUrl: typeof entry.sourceUrl === 'string' ? entry.sourceUrl : undefined,
		})
	}
	return items
}

export function resolveStoredFeed<T>(
	payload: unknown,
	fallback: T[],
	parse: (value: unknown) => T[] | null = (value) =>
		Array.isArray(value) ? (value as T[]) : null,
): { items: T[]; source: 'neon' | 'catalog' } {
	const parsed = parse(payload)
	if (!parsed || parsed.length === 0) {
		return { items: fallback, source: 'catalog' }
	}
	return { items: parsed, source: 'neon' }
}

function rssText(value: string) {
	return value
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&#8217;/g, "'")
		.replace(/\s+/g, ' ')
		.trim()
}

function rssField(block: string, tag: string) {
	const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
	return match ? rssText(match[1]) : ''
}

/** The lead image of a feed item: media tags, an image enclosure, or the first real image in the body. */
export function rssImage(block: string): string | undefined {
	const candidates = [
		block.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*>/i)?.[1],
		block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)?.[1],
		block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/i)?.[1],
		block.match(/<enclosure[^>]+type=["']image[^>]+url=["']([^"']+)["']/i)?.[1],
		...[...block.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)]
			.filter((match) => !/width=["']?1["'\s]|height=["']?1["'\s]/i.test(match[0]))
			.map((match) => match[1]),
	]
	return candidates
		.map((url) => url?.replace(/&amp;/g, '&').replace(/&#0?38;/g, '&'))
		.find((url) => url && /^https:\/\//.test(url) && !/gravatar|emoji|feeds\.feedburner|pixel|\.svg(\?|$)/i.test(url))
}

function rssDate(value: string) {
	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return undefined
	}
	return parsed.toISOString().slice(0, 10)
}

export function parseRssNews(
	xml: string,
	entities: Array<{ id: string; label: string; kind?: MentionLabel['kind'] }>,
): NewsItem[] {
	const channel = xml.match(/<channel[\s\S]*$/i)?.[0] ?? xml
	const publication = publicationName(rssField(channel.split(/<item[\s>]/i)[0] ?? '', 'title'))
	const labels: MentionLabel[] = entities
		.map((entity) => ({ id: entity.id, label: entity.label.trim(), kind: entity.kind ?? 'entity' as const }))
		.filter((entity) => entity.kind === 'person' || usableEntityLabel(entity.label))
		.sort((a, b) => b.label.length - a.label.length)
	const items: NewsItem[] = []
	const seen = new Set<string>()
	for (const block of xml.match(/<item[\s\S]*?<\/item>/gi) ?? []) {
		const title = rssField(block, 'title')
		const url = rssField(block, 'link')
		if (!title || !url || seen.has(url)) {
			continue
		}
		seen.add(url)
		const description = rssField(block, 'description')
		const entityIds = mentionedIds(`${title}. ${description}`, labels)
		const slug = url
			.replace(/https?:\/\//, '')
			.replace(/[^a-z0-9]+/gi, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 80)
		items.push({
			id: `rss-${slug}`,
			summary: title,
			excerpt: description || undefined,
			url,
			publication,
			publishedAt: rssDate(rssField(block, 'pubDate')),
			imageUrl: rssImage(block),
			entityIds: [...new Set(entityIds)],
		})
	}
	return items
}

/** WordPress titles later feed pages "Page 2 – Daily Trust"; the publication is the name without it. */
export function publicationName(title: string) {
	return decodeHtml(title).replace(/^Page \d+\s*[–—|•\-:]\s*/i, '').replace(/\s+-\s+Latest News$/i, '').trim() || 'Official feed'
}

/** Re-derives entity tags so stories stored before a matcher fix are tagged by the current rules. */
export function retagNews(news: NewsItem[], labels: MentionLabel[]): NewsItem[] {
	return news.map((raw) => {
		const item = { ...raw, publication: publicationName(raw.publication) }
		const inline = [...item.summary.matchAll(/<gov_entities='([^']+)'>/g)].map((match) => match[1])
		if (inline.length) return { ...item, entityIds: [...new Set([...inline, ...(item.entityIds ?? [])])] }
		const text = `${item.summary}. ${item.excerpt ?? ''}`
		return { ...item, entityIds: mentionedIds(text, labels) }
	})
}

export function newsForEntity(news: NewsItem[], ids: string[]): NewsItem[] {
	const wanted = new Set(ids)
	return news.filter((item) => item.entityIds?.some((id) => wanted.has(id)))
}

export function changesInWindow<T extends { date: string }>(
	changes: T[],
	days: number,
	now: Date,
): T[] {
	const cutoff = new Date(now)
	cutoff.setUTCDate(cutoff.getUTCDate() - days)
	return changes.filter((change) => {
		const dated = new Date(`${change.date}T00:00:00Z`)
		return !Number.isNaN(dated.getTime()) && dated >= cutoff && dated <= now
	})
}

/** Reads a page's og:image (or twitter:image), the picture a site chooses for sharing the story. */
export function pageImage(html: string): string | undefined {
	const head = html.slice(0, 60000)
	const match =
		head.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ??
		head.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ??
		head.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
	const url = match?.[1]?.replace(/&amp;/g, '&')
	return url && /^https:\/\//.test(url) ? url : undefined
}

/**
 * Stories that name the government but arrived without a picture get the article's own share image.
 * Capped per run so the daily refresh stays quick; the rest are picked up on later runs.
 */
export async function enrichNewsImages(news: NewsItem[], fetchImpl: typeof fetch = fetch, limit = 60, concurrency = 8) {
	const targets = news.filter((item) => !item.imageUrl && item.entityIds?.length).slice(0, limit)
	let cursor = 0
	const worker = async () => {
		while (cursor < targets.length) {
			const item = targets[cursor++]
			try {
				const res = await fetchImpl(item.url, { headers: { 'user-agent': 'Govgraph/0.1' }, signal: AbortSignal.timeout(6000) })
				if (res.ok) item.imageUrl = pageImage(await res.text())
			} catch {
				// A slow or blocked site keeps its placeholder until a later run.
			}
		}
	}
	await Promise.all(Array.from({ length: concurrency }, worker))
	return news
}
