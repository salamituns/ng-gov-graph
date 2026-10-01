import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ministriesTotal } from './cabinet-budget'

describe('budgets of the ministries a state’s ministers serve in', () => {
	it('counts a shared ministry once', () => {
		const works = { id: 'works', label: 'Works', total: 300 }
		assert.deepEqual(ministriesTotal([works, works, { id: 'health', label: 'Health', total: 200 }]), { total: 500, count: 2, uncounted: [] })
	})

	it('names ministries without a line instead of counting them as zero', () => {
		const result = ministriesTotal([{ id: 'fct', label: 'Ministry of the FCT' }, { id: 'works', label: 'Works', total: 300 }])
		assert.equal(result.total, 300)
		assert.deepEqual(result.uncounted, ['the Ministry of the FCT'])
	})
})
