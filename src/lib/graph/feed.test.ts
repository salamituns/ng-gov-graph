import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseChangesFeed, parseNewsFeed } from './feed'

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
