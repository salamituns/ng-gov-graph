import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compileNigeriaGraph } from './nigeria'
import { neighborhood } from './neighborhood'
import { changesInWindow, newsForEntity } from './feed'

describe('dossier neighborhood', () => {
	it('keeps the ministry, its parastatal, and the hub, and drops an unrelated court', () => {
		const graph = compileNigeriaGraph()
		const local = neighborhood(graph, 'ng-ministry-of-finance')
		assert.ok(local.nodes['ng-firs'])
		assert.ok(local.nodes[graph.constituency])
		assert.equal(local.nodes['ng-supreme-court'], undefined)
	})
})

describe('news and changes windows', () => {
	it('returns headlines that name the entity', () => {
		const matched = newsForEntity(
			[
				{
					id: 'a',
					summary: 'Finance',
					url: 'https://example.com/a',
					publication: 'State House',
					entityIds: ['ng-ministry-of-finance'],
				},
				{
					id: 'b',
					summary: 'Court',
					url: 'https://example.com/b',
					publication: 'State House',
					entityIds: ['ng-supreme-court'],
				},
			],
			['ng-ministry-of-finance', 'ng-firs'],
		)
		assert.deepEqual(matched.map((item) => item.id), ['a'])
	})

	it('keeps personnel changes inside the requested window', () => {
		const rows = changesInWindow(
			[
				{ date: '2026-09-20', id: 'new' },
				{ date: '2026-04-21', id: 'old' },
			],
			30,
			new Date('2026-09-22T00:00:00Z'),
		)
		assert.deepEqual(rows.map((row) => row.id), ['new'])
	})
})
