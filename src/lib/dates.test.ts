import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatLagosDate, formatNewsDate, lagosDay } from './dates'

describe('Lagos dates', () => {
	it('omits invalid feed dates instead of rendering Invalid Date', () => {
		assert.equal(formatNewsDate('yesterday'), undefined)
		assert.equal(formatNewsDate('Mon, 3 Nov'), undefined)
		assert.equal(formatNewsDate('2026-99-99'), undefined)
		assert.equal(formatNewsDate(''), undefined)
		assert.equal(formatNewsDate(undefined), undefined)
		assert.equal(formatNewsDate('2026-11-03'), '3 Nov 2026')
	})
	it('uses the same Lagos calendar day across UTC midnight boundaries', () => {
		assert.equal(lagosDay(new Date('2026-11-03T22:59:59Z')), '2026-11-03')
		assert.equal(lagosDay(new Date('2026-11-03T23:00:00Z')), '2026-11-04')
		assert.equal(formatLagosDate('2027-01-16'), '16 Jan 2027')
	})
})
