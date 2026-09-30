import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BUDGET_2026, naira } from '@/data/nigeria/budget'
import { AGENCY_BUDGETS, MINISTRY_BUDGETS } from '@/data/nigeria/budget-2026'
import { compileNigeriaGraph } from './nigeria'

const graph = compileNigeriaGraph()

describe('2026 budget', () => {
	it('attaches every figure to a body on the map', () => {
		for (const id of [...Object.keys(MINISTRY_BUDGETS), ...Object.keys(AGENCY_BUDGETS)]) assert.ok(graph.nodes[id], id)
	})

	it('matches the Act on figures checked by hand', () => {
		assert.equal(MINISTRY_BUDGETS['ng-ministry-of-defence'].total, 3_158_223_400_291, 'Act p.67')
		assert.equal(MINISTRY_BUDGETS['ng-ministry-of-works'].total, 3_590_624_100_547, 'Act p.1523')
		assert.equal(AGENCY_BUDGETS['ng-efcc'].total, 88_569_539_067, 'Act p.32')
	})

	it('keeps debt service and the service-wide vote out of the ministries’ own spending', () => {
		assert.ok(MINISTRY_BUDGETS['ng-ministry-of-finance'].total < 1e12)
		assert.ok(MINISTRY_BUDGETS['ng-ministry-of-budget'].total < 1e12)
		assert.ok((MINISTRY_BUDGETS['ng-ministry-of-finance'].passThrough?.[0].total ?? 0) > 15e12)
		const own = Object.values(MINISTRY_BUDGETS).reduce((sum, budget) => sum + budget.total, 0)
		assert.ok(own < BUDGET_2026.total, 'ministries cannot exceed the whole budget')
	})

	it('adds up line by line', () => {
		for (const [id, line] of Object.entries(AGENCY_BUDGETS)) {
			if (line.code === '0155002001') continue // printed total differs from its parts in the Act
			assert.equal(line.personnel + line.overhead + line.capital, line.total, id)
		}
	})

	it('writes naira amounts the way Nigerian papers do', () => {
		assert.equal(naira(68_320_000_000_000), '₦68.32 trillion')
		assert.equal(naira(88_569_539_067), '₦88.6 billion')
		assert.equal(naira(950_000_000), '₦950 million')
	})
})
