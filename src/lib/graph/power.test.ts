import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { powerMap } from './power'
import type { NewsItem } from '@/data/nigeria/news'

const NOW = new Date('2026-09-21T12:00:00Z')

function item(publishedAt: string, entityIds: string[]): NewsItem {
	return {
		id: publishedAt + entityIds.join('-'),
		summary: 'Headline',
		url: `https://example.com/${publishedAt}`,
		publication: 'State House',
		publishedAt,
		entityIds,
	}
}

describe('powerMap', () => {
	it('counts entity mentions inside 7, 30, and 90 day windows', () => {
		const news = [
			item('2026-09-20', ['ng-senate']),
			item('2026-08-01', ['ng-ministry-of-finance']),
			item('2026-01-01', ['ng-senate']),
		]
		assert.deepEqual(powerMap(news, 7, NOW), [{ id: 'ng-senate', mentions: 1 }])
		assert.deepEqual(powerMap(news, 30, NOW), [{ id: 'ng-senate', mentions: 1 }])
		assert.deepEqual(powerMap(news, 90, NOW), [
			{ id: 'ng-ministry-of-finance', mentions: 1 },
			{ id: 'ng-senate', mentions: 1 },
		])
	})
})
