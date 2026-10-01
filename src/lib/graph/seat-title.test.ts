import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { seatTitle } from './seat-title'
import type { CompiledGraph, GraphNode } from './types'

function node(id: string, name: string, extra: Partial<GraphNode> = {}): GraphNode {
	return { id, name, type: 'dept_head', description: '', aliases: [], people: [], edges: [], connectedNodes: [], ...extra }
}

const graph = {
	nodes: Object.fromEntries(
		[
			node('works', 'Federal Ministry of Works', { type: 'department' }),
			node('defence', 'Ministry of Defence', { type: 'department' }),
			node('efcc', 'Economic and Financial Crimes Commission', { type: 'commission', aliases: ['EFCC'] }),
			node('nafdac-body', 'National Agency for Food and Drug Administration and Control', { type: 'corporation' }),
			node('works-min', 'Honourable Minister', { parentId: 'works' }),
			node('defence-min', 'Honourable Minister', { parentId: 'defence' }),
			node('works-mos', 'Honourable Minister of State', { parentId: 'works' }),
			node('defence-mos', 'Honourable Minister of State', { parentId: 'defence' }),
			node('efcc-chair', 'Executive Chairman', { parentId: 'efcc' }),
			node('dg-a', 'Director-General', { parentId: 'nafdac-body' }),
			node('dg-b', 'Director-General', { parentId: 'efcc' }),
			node('ag', 'Attorney-General of the Federation and Minister of Justice', { parentId: 'works' }),
		].map((item) => [item.id, item]),
	),
	edges: {},
} as unknown as CompiledGraph

describe('seat titles', () => {
	it('names a minister by ministry', () => {
		assert.equal(seatTitle(graph, graph.nodes['works-min']), 'Minister of Works')
		assert.equal(seatTitle(graph, graph.nodes['defence-min']), 'Minister of Defence')
		assert.equal(seatTitle(graph, graph.nodes['works-mos']), 'Minister of State for Works')
	})

	it('adds the body to other shared titles, by acronym when it has one', () => {
		assert.equal(seatTitle(graph, graph.nodes['dg-b']), 'Director-General, EFCC')
		assert.equal(seatTitle(graph, graph.nodes['dg-a']), 'Director-General, National Agency for Food and Drug Administration and Control')
	})

	it('keeps titles that are already unique, and bodies as they are', () => {
		assert.equal(seatTitle(graph, graph.nodes['efcc-chair']), 'Executive Chairman')
		assert.equal(seatTitle(graph, graph.nodes.ag), 'Attorney-General of the Federation and Minister of Justice')
		assert.equal(seatTitle(graph, graph.nodes.works), 'Federal Ministry of Works')
	})
})
