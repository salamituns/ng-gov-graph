import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compileNigeriaGraph } from './nigeria'
import { filterGraph } from './filter'
import { layoutGraph } from './layout'

describe('NASS occupancy', () => {
	it('compiles 109 senatorial district seats and 360 House seats', () => {
		const graph = compileNigeriaGraph()
		const senators = Object.values(graph.nodes).filter((node) =>
			node.id.startsWith('ng-senator-'),
		)
		const reps = Object.values(graph.nodes).filter((node) =>
			node.id.startsWith('ng-rep-'),
		)
		assert.equal(senators.length, 109)
		assert.equal(reps.length, 360)
		assert.ok(senators.every((node) => node.type === 'dept_head'))
		assert.ok(reps.every((node) => node.type === 'dept_head'))
	})

	it('gives each state three senators and the FCT one', () => {
		const graph = compileNigeriaGraph()
		const byState = new Map<string, number>()
		for (const node of Object.values(graph.nodes)) {
			if (!node.id.startsWith('ng-senator-')) {
				continue
			}
			const elect = Object.values(graph.edges).find(
				(edge) => edge.type === 'elects' && edge.toId === node.id,
			)
			assert.ok(elect, `missing elects edge for ${node.id}`)
			byState.set(elect.fromId, (byState.get(elect.fromId) ?? 0) + 1)
		}
		assert.equal(byState.get('ng-fct'), 1)
		assert.equal(byState.get('ng-lagos-state'), 3)
		assert.equal(
			[...byState.values()].reduce((sum, count) => sum + count, 0),
			109,
		)
	})

	it('keeps district seats off the federal map', () => {
		const graph = filterGraph(compileNigeriaGraph(), 'federal')
		const placed = layoutGraph(graph, 800, 800)
		assert.equal(
			placed.some((item) => item.id.startsWith('ng-senator-')),
			false,
		)
		assert.equal(
			placed.some((item) => item.id.startsWith('ng-rep-')),
			false,
		)
		assert.ok(placed.some((item) => item.id === 'ng-senate'))
		assert.ok(placed.some((item) => item.id === 'ng-house-of-representatives'))
	})

	it('keeps chamber leadership as distinct offices from district seats', () => {
		const graph = compileNigeriaGraph()
		assert.ok(graph.nodes['ng-president-of-the-senate'])
		assert.ok(graph.nodes['ng-senator-akwa-ibom-north-west'])
		assert.notEqual(
			graph.nodes['ng-president-of-the-senate'].id,
			graph.nodes['ng-senator-akwa-ibom-north-west'].id,
		)
	})
})
