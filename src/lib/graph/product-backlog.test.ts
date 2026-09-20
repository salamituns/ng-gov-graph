import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { layoutGraph } from './layout'
import { compileNigeriaGraph } from './nigeria'
import { applyPortraitUrls } from './portraits'
import { extractCivicUpdates } from '../ai/monitor'

describe('people layout', () => {
	it('places occupied officeholders as holder nodes in people mode', () => {
		const graph = compileNigeriaGraph()
		const orgs = layoutGraph(graph, 800, 800, { mode: 'orgs' })
		const people = layoutGraph(graph, 800, 800, { mode: 'people' })
		assert.equal(
			orgs.some((item) => item.id.startsWith('holder:')),
			false,
		)
		assert.equal(
			people.some((item) => item.id === 'holder:ng-president'),
			true,
		)
		assert.equal(
			people.some((item) => item.id.startsWith('holder:ng-senator-')),
			false,
		)
	})
})

describe('portraits', () => {
	it('attaches a portrait url to named people that lack one', () => {
		const graph = compileNigeriaGraph()
		applyPortraitUrls(graph, {
			'Bola Ahmed Tinubu':
				'https://upload.wikimedia.org/wikipedia/commons/tinubu.jpg',
		})
		assert.equal(
			graph.nodes['ng-president'].people[0]?.imageUrl,
			'https://upload.wikimedia.org/wikipedia/commons/tinubu.jpg',
		)
		assert.equal(
			graph.nodes['ng-president-of-the-senate'].people[0]?.imageUrl,
			undefined,
		)
	})
})

describe('civic monitor', () => {
	it('parses model output into news and personnel changes', async () => {
		const result = await extractCivicUpdates(
			'Tinubu swore in a new minister on 1 May 2026.',
			async () => ({
				news: [
					{
						id: 'news-minister',
						summary: 'A new minister was sworn in.',
						url: 'https://statehouse.gov.ng/',
						publication: 'State House',
					},
				],
				changes: [
					{
						kind: 'personnel' as const,
						id: 'chg-minister',
						date: '2026-05-01',
						personName: 'Example Minister',
						positionId: 'ng-office-of-the-president',
						positionName: 'Minister',
						groupId: 'ng-president',
						entryMode: 'sworn' as const,
						departure: false,
						predecessorName: null,
					},
				],
			}),
		)
		assert.equal(result.news[0]?.id, 'news-minister')
		assert.equal(result.changes[0]?.personName, 'Example Minister')
	})
})
