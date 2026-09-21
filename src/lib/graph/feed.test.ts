import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseChangesFeed, parseNewsFeed, resolveStoredFeed } from './feed'

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
