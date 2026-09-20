import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compileNigeriaGraph } from './nigeria'
import { chamberRoster } from './roster'

describe('chamberRoster', () => {
	it('lists 109 Senate district seats grouped by state', () => {
		const graph = compileNigeriaGraph()
		const roster = chamberRoster(graph, 'ng-senate')
		assert.ok(roster)
		assert.equal(roster.kind, 'senate')
		assert.equal(roster.seats.length, 109)
		const lagos = roster.seats.filter((seat) => seat.stateId === 'ng-lagos-state')
		assert.equal(lagos.length, 3)
		assert.ok(
			roster.seats.some(
				(seat) =>
					seat.id === 'ng-senator-akwa-ibom-north-west' &&
					seat.person?.name.includes('Akpabio'),
			),
		)
	})

	it('lists 360 House seats', () => {
		const graph = compileNigeriaGraph()
		const roster = chamberRoster(graph, 'ng-house-of-representatives')
		assert.ok(roster)
		assert.equal(roster.kind, 'house')
		assert.equal(roster.seats.length, 360)
	})

	it('returns null for a non-chamber org', () => {
		const graph = compileNigeriaGraph()
		assert.equal(chamberRoster(graph, 'ng-president'), null)
	})
})
