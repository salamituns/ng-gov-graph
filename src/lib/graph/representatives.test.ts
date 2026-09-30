import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compileNigeriaGraph } from './nigeria'
import { representativesFor } from './representatives'

const graph = compileNigeriaGraph()

describe('who represents me', () => {
	it('gives a state its elected governor, three senators, House members and assembly', () => {
		const lagos = representativesFor(graph, 'ng-lagos-state')
		assert.ok(lagos)
		assert.equal(lagos.leader.elected, true)
		assert.ok(lagos.leader.person?.name)
		assert.equal(lagos.senators.length, 3)
		assert.ok(lagos.representatives.length >= 20, `Lagos has 24 federal constituencies, got ${lagos.representatives.length}`)
		assert.equal(lagos.assembly?.id, 'ng-lagos-house-of-assembly')
	})

	it('gives the FCT one senator and an appointed minister, not a governor', () => {
		const fct = representativesFor(graph, 'ng-fct')
		assert.ok(fct)
		assert.equal(fct.leader.elected, false)
		assert.equal(fct.senators.length, 1)
	})

	it('covers every state with 109 senators in all', () => {
		const states = Object.values(graph.nodes).filter((node) => node.type === 'state')
		const senators = states.reduce((sum, state) => sum + (representativesFor(graph, state.id)?.senators.length ?? 0), 0)
		assert.equal(states.length, 37)
		assert.equal(senators, 109)
	})
})
