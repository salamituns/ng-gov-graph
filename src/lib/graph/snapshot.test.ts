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

	it('fills sourced heads in a stored snapshot and replaces only a documented predecessor', async () => {
		const stored = compileNigeriaGraph()
		stored.nodes['ng-ngsa-head'].people = []
		stored.nodes['ng-ngsa-head'].unrecorded = true
		stored.nodes['ng-ngsa'].people = []
		stored.nodes['ng-jamb-head'].people = [{ name: 'Is-haq Oloyede' }]
		stored.nodes['ng-jamb'].people = [{ name: 'Is-haq Oloyede' }]
		stored.nodes['ng-ncc-head'].people = [{ name: 'Different recorded holder' }]
		stored.nodes['ng-ncc'].people = [{ name: 'Different recorded holder' }]
		const { graph } = await resolveNigeriaGraph(async () => stored)
		assert.equal(graph.nodes['ng-ngsa-head'].people[0]?.name, 'Olusegun O. Ige')
		assert.equal(graph.nodes['ng-ngsa'].people[0]?.sourceUrl, 'https://ngsa.gov.ng/management-team/')
		assert.equal(graph.nodes['ng-jamb-head'].people[0]?.name, 'Segun Aina')
		assert.equal(graph.nodes['ng-ncc-head'].people[0]?.name, 'Different recorded holder')
		assert.equal(graph.nodes['ng-niwa-head'].people[0]?.name, 'Umar Yusuf Girei')
		assert.equal(graph.nodes['ng-niwa-head'].people[0]?.acting, true)
		assert.equal(graph.nodes['ng-naec-head'].name, 'Chairman and Chief Executive')
		assert.equal(graph.nodes['ng-naec-head'].people[0]?.name, 'Anthony Inalegwu Godwin')
		assert.equal(graph.nodes['ng-naqs-head'].name, 'Comptroller-General')
		assert.equal(graph.nodes['ng-naqs-head'].people[0]?.name, 'Vincent Isegbe')
		assert.equal(graph.nodes['ng-niss-head'].people[0]?.acting, true)
	})
})
