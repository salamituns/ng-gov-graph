import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseChangesFeed, parseNewsFeed, parseRssNews, resolveStoredFeed } from './feed'

describe('parseNewsFeed', () => {
	it('accepts a news array and rejects junk', () => {
		const ok = parseNewsFeed([
			{
				id: 'n1',
				summary: 'Hello',
				url: 'https://example.com',
				publication: 'Test',
			},
		])
		assert.equal(ok?.[0]?.id, 'n1')
		assert.equal(parseNewsFeed({}), null)
	})

	it('prefers a Postgres news payload and falls back to the catalog', () => {
		const stored = resolveStoredFeed(
			[
				{
					id: 'live',
					summary: 'From Neon',
					url: 'https://statehouse.gov.ng/',
					publication: 'State House',
				},
			],
			[
				{
					id: 'catalog',
					summary: 'Fallback',
					url: 'https://example.com',
					publication: 'Catalog',
				},
			],
		)
		assert.equal(stored.source, 'neon')
		assert.equal(stored.items[0]?.id, 'live')
		const fallback = resolveStoredFeed(null, [
			{
				id: 'catalog',
				summary: 'Fallback',
				url: 'https://example.com',
				publication: 'Catalog',
			},
		])
		assert.equal(fallback.source, 'catalog')
		assert.equal(fallback.items[0]?.id, 'catalog')
	})

	it('turns an RSS item into dated news tagged to a known entity', () => {
		const items = parseRssNews(
			`<?xml version="1.0"?>
			<rss><channel>
			<item>
			<title>President receives the Minister of Finance</title>
			<link>https://statehouse.gov.ng/finance-visit/</link>
			<pubDate>Tue, 01 Sep 2026 09:00:00 GMT</pubDate>
			<description>A meeting with the Ministry of Finance.</description>
			</item>
			</channel></rss>`,
			[{ id: 'ng-ministry-of-finance', label: 'Ministry of Finance' }],
		)
		assert.equal(items.length, 1)
		assert.equal(items[0]?.url, 'https://statehouse.gov.ng/finance-visit/')
		assert.equal(items[0]?.publishedAt, '2026-09-01')
		assert.deepEqual(items[0]?.entityIds, ['ng-ministry-of-finance'])
		assert.equal(items[0]?.id.startsWith('news-cabinet'), false)
	})

	it('does not tag a headline just because it says President', () => {
		const items = parseRssNews(
			`<rss><channel><item>
			<title>PRESIDENT TINUBU EXTENDS A VACATION</title>
			<link>https://statehouse.gov.ng/vacation/</link>
			<pubDate>Tue, 01 Sep 2026 09:00:00 GMT</pubDate>
			<description>The Ministry of Finance was not involved. FIRS collected taxes.</description>
			</item></channel></rss>`,
			[
				{ id: 'ng-president', label: 'President' },
				{ id: 'ng-ministry-of-finance', label: 'Ministry of Finance' },
				{ id: 'ng-firs', label: 'FIRS' },
			],
		)
		assert.deepEqual(items[0]?.entityIds, ['ng-ministry-of-finance', 'ng-firs'])
	})
})

describe('parseChangesFeed', () => {
	it('accepts personnel rows', () => {
		const ok = parseChangesFeed([
			{
				kind: 'personnel',
				id: 'c1',
				date: '2026-04-21',
				personName: 'A',
				positionId: 'p',
				positionName: 'P',
				groupId: 'g',
				entryMode: 'appointed',
				departure: false,
				predecessorName: null,
			},
		])
		assert.equal(ok?.[0]?.id, 'c1')
		assert.equal(parseChangesFeed([{ kind: 'other' }]), null)
	})
})
