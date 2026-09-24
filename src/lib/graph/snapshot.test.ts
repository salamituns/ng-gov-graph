import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compileNigeriaGraph, parseGraphSnapshot, resolveNigeriaGraph } from './nigeria'

describe('parseGraphSnapshot', () => {
	it('returns a compiled graph from a stored payload', () => {
		const graph = compileNigeriaGraph()
		const parsed = parseGraphSnapshot(graph)
		assert.equal(parsed?.constituency, graph.constituency)
		assert.ok(parsed && parsed.nodes[graph.constituency])
	})

	it('rejects missing or malformed payloads', () => {
		assert.equal(parseGraphSnapshot(null), null)
		assert.equal(parseGraphSnapshot({}), null)
		assert.equal(parseGraphSnapshot({ nodes: [], edges: {} }), null)
	})
})

describe('resolveNigeriaGraph', () => {
	it('uses a Neon snapshot when the payload is valid', async () => {
		const stored = compileNigeriaGraph()
		stored.constituency = 'ng-people'
		const resolved = await resolveNigeriaGraph(async () => stored)
		assert.equal(resolved.source, 'neon')
		assert.equal(resolved.graph.constituency, 'ng-people')
	})

	it('compiles from catalogs when Neon has no snapshot', async () => {
		const resolved = await resolveNigeriaGraph(async () => null)
		assert.equal(resolved.source, 'catalog')
		assert.ok(resolved.graph.nodes['ng-people'])
	})

	it('adds missing agencies without replacing live snapshot data', async () => {
		const stored = compileNigeriaGraph()
		stored.nodes['ng-president'].people = [{ name: 'Snapshot incumbent' }]
		delete stored.nodes['ng-nbte']
		delete stored.nodes['ng-boa']
		stored.departments = stored.departments.filter((id) => id !== 'ng-nbte')
		stored.corporations = stored.corporations.filter((id) => id !== 'ng-boa')
		stored.satellites = stored.satellites.filter((id) => id !== 'ng-nbte' && id !== 'ng-boa')
		for (const [id, edge] of Object.entries(stored.edges)) {
			if (edge.toId === 'ng-nbte' || edge.fromId === 'ng-nbte' || edge.toId === 'ng-boa' || edge.fromId === 'ng-boa') delete stored.edges[id]
		}
		const { graph } = await resolveNigeriaGraph(async () => stored)
		assert.equal(graph.nodes['ng-president'].people[0]?.name, 'Snapshot incumbent')
		assert.equal(graph.nodes['ng-nbte'].parentId, 'ng-ministry-of-education')
		assert.ok(graph.nodes['ng-ministry-of-education'].connectedNodes.includes('ng-nbte'))
		assert.equal(graph.departments.filter((id) => id === 'ng-nbte').length, 1)
		assert.equal(graph.corporations.filter((id) => id === 'ng-boa').length, 1)
		assert.ok(!stored.nodes['ng-nbte'])
	})
})
