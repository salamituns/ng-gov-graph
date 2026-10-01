import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { perNigerian, POPULATION_2026 } from '@/data/nigeria/budget'

describe('per-Nigerian amounts', () => {
	it('rounds to three figures', () => {
		assert.equal(perNigerian(68_320_000_000_000), '₦282,000')
		assert.equal(perNigerian(3_590_000_000_000), '₦14,800')
	})

	it('keeps small amounts whole', () => {
		assert.equal(perNigerian(POPULATION_2026.total * 59.4), '₦59')
		assert.equal(perNigerian(POPULATION_2026.total * 412.4), '₦412')
	})
})
