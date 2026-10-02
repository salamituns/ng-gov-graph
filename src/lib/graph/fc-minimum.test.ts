import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { stateAgainstMinimum, zoneAgainstMinimum } from './fc-minimum'

// The October 2026 cabinet: Ondo 3, nine states 2, twenty-seven at 1.
const ALL = [3, ...Array(9).fill(2), ...Array(27).fill(1)]

describe('a state against the Constitution\'s minimum', () => {
	it('says where one minister stands', () => {
		assert.equal(stateAgainstMinimum(1, ALL), "The Constitution's minimum: one per state")
	})

	it('counts ministers above the minimum', () => {
		assert.equal(stateAgainstMinimum(2, ALL), "One more than the Constitution's minimum")
	})

	it('names the most, and a tie', () => {
		assert.equal(stateAgainstMinimum(3, ALL), 'Two more than the minimum, the most of any state')
		assert.equal(stateAgainstMinimum(2, [2, 2, 1]), 'One more than the minimum, joint most of any state')
	})

	it('flags a state below the minimum', () => {
		assert.equal(stateAgainstMinimum(0, [0, ...ALL]), "Below the Constitution's minimum of one")
	})
})

describe('a zone against the minimum', () => {
	it('one each is the minimum for each', () => {
		assert.equal(zoneAgainstMinimum([1, 1, 1, 1, 1, 1]), 'One per state: the minimum for each')
	})

	it('counts the ministers above one per state', () => {
		// North West: 12 ministers across 7 states.
		assert.equal(zoneAgainstMinimum([2, 2, 2, 2, 2, 1, 1]), 'Five more than the minimum of one per state')
	})

	it('names states without a minister', () => {
		assert.equal(zoneAgainstMinimum([1, 0, 1]), 'One state has no minister on record')
		assert.equal(zoneAgainstMinimum([3, 0, 0]), 'Two more than the minimum of one per state; two states have no minister on record')
	})
})
