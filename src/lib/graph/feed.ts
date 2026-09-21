import type { NewsItem } from '@/data/nigeria/news'
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
			url: entry.url,
			publication: entry.publication,
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
