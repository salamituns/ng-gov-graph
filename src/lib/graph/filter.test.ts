import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildGraph } from './build-graph'
import { filterGraph } from './filter'
import { summarizeOverview } from './overview'
import type { Catalog } from './types'

const fixture: Catalog = {
	id: 'ng',
	name: 'Federal Republic of Nigeria',
	constituency: {
		id: 'ng-people',
		name: 'People of Nigeria',
		description: 'The sovereign people.',
	},
	entities: [
		{
			id: 'ng-president',
			name: 'President',
			type: 'elected',
			sector: 'executive',
			layer: 'federal',
			description: 'Head of government.',
			legalSourceUrl: 'https://example.com',
			head: {
				id: 'ng-office-of-the-president',
				title: 'President',
				person: { name: 'Bola Ahmed Tinubu' },
			},
		},
		{
			id: 'ng-lagos-state',
			name: 'Lagos State',
			type: 'state',
			sector: 'executive',
			layer: 'state',
			description: 'A federating state.',
			legalSourceUrl: 'https://example.com',
			aliases: ['Lagos'],
			head: {
				id: 'ng-governor-of-lagos',
				title: 'Governor of Lagos State',
				person: { name: 'Babajide Sanwo-Olu', party: 'APC' },
			},
		},
		{
			id: 'ng-lagos-house-of-assembly',
			name: 'Lagos State House of Assembly',
			type: 'elected',
			sector: 'legislative',
			layer: 'state',
			parentId: 'ng-lagos-state',
			description: 'State legislature.',
			legalSourceUrl: 'https://example.com',
		},
	],
	elects: [
		{ fromId: 'ng-people', toId: 'ng-president' },
		{ fromId: 'ng-people', toId: 'ng-governor-of-lagos' },
	],
	oversees: [{ fromId: 'ng-lagos-state', toId: 'ng-lagos-house-of-assembly' }],
}

describe('filterGraph', () => {
	it('keeps only federal organizations on the default federal layer', () => {
		const graph = filterGraph(buildGraph(fixture), 'federal')
		assert.ok(graph.nodes['ng-president'])
		assert.equal(graph.nodes['ng-lagos-state'], undefined)
		assert.equal(graph.nodes['ng-governor-of-lagos'], undefined)
		assert.ok(graph.nodes['ng-people'])
	})

	it('keeps states, assemblies, and governors on the states layer', () => {
		const graph = filterGraph(buildGraph(fixture), 'states')
		assert.ok(graph.nodes['ng-lagos-state'])
		assert.ok(graph.nodes['ng-lagos-house-of-assembly'])
		assert.ok(graph.nodes['ng-governor-of-lagos'])
		assert.equal(graph.nodes['ng-president'], undefined)
	})

	it('keeps every node when layer is all', () => {
		const graph = filterGraph(buildGraph(fixture), 'all')
		assert.ok(graph.nodes['ng-president'])
		assert.ok(graph.nodes['ng-lagos-state'])
		assert.equal(summarizeOverview(graph).organizationCount, 3)
	})
})
