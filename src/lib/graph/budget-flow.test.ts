import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { budgetFlow } from './budget-flow'
import { compileNigeriaGraph } from './nigeria'

const flow = budgetFlow(compileNigeriaGraph())

describe('budget flow', () => {
	it('splits the whole budget into parts that add up to it', () => {
		const parts = flow.parts.reduce((sum, part) => sum + part.value, 0)
		assert.equal(parts, flow.total)
		assert.ok(flow.parts.every((part) => part.value > 0))
	})

	it('splits the ministries’ share across the largest bodies and the rest', () => {
		const ministries = flow.parts.find((part) => part.id === 'ministries')!.value
		const bodies = flow.ministries.reduce((sum, m) => sum + m.total, 0) + flow.others.total
		assert.equal(bodies, ministries)
		assert.equal(flow.ministries[0].label, 'Works')
		assert.equal(flow.ministries.length, 12)
	})

	it('splits each body into salaries, running costs and projects', () => {
		for (const m of [...flow.ministries, flow.others]) {
			assert.equal(m.personnel + m.overhead + m.capital, m.total, m.label)
		}
	})
})
