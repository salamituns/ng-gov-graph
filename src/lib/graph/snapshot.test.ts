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
})
