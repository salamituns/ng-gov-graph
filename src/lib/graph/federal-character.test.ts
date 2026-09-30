import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { MINISTER_ORIGINS } from '@/data/nigeria/origins'
import { STATE_ZONES } from '@/data/nigeria/states'
import { federalCharacter } from './federal-character'
import { compileNigeriaGraph } from './nigeria'

const graph = compileNigeriaGraph()
const report = federalCharacter(graph)

describe('federal character', () => {
	it('sources a state for every minister in the catalogue', () => {
		assert.deepEqual(report.unsourced.map((member) => member.person.name), [])
	})

	it('counts each person once and leaves the President out', () => {
		const names = report.members.map((member) => member.person.name)
		assert.equal(new Set(names).size, names.length)
		assert.ok(!names.includes('Bola Ahmed Tinubu'))
		const wike = report.members.find((member) => member.person.name === 'Nyesom Wike')
		assert.ok(wike && wike.seats.length >= 1)
	})

	it('only records real states', () => {
		for (const [name, origin] of Object.entries(MINISTER_ORIGINS)) {
			assert.ok(STATE_ZONES[origin.stateId], `${name}: unknown state ${origin.stateId}`)
			assert.match(origin.sourceUrl, /^https?:\/\//)
		}
	})

	it('meets section 147(3): a minister from every state and the FCT', () => {
		assert.equal(report.states.length, 37)
		assert.deepEqual(report.uncovered.map((state) => state.id), [])
	})

	it('adds up across the six zones', () => {
		const total = report.zones.reduce((sum, zone) => sum + zone.members.length, 0)
		assert.equal(total, report.members.length)
		assert.equal(report.zones.reduce((sum, zone) => sum + zone.states, 0), 37)
	})
})
