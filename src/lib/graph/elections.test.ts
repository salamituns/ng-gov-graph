import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { GENERAL_ELECTION, governorshipFor, MILESTONES, nextPoll, OFF_CYCLE } from '@/data/nigeria/elections'
import { STATE_ZONES } from '@/data/nigeria/states'

describe('election countdown', () => {
	it('counts to the presidential poll first, then the governorship poll, then stops', () => {
		assert.equal(nextPoll(new Date('2026-09-25T12:00:00Z'))?.id, 'federal')
		assert.equal(nextPoll(new Date('2027-01-16T07:29:00Z'))?.id, 'federal', 'polls open 8:30 WAT, which is 7:30 UTC')
		assert.equal(nextPoll(new Date('2027-01-16T07:31:00Z'))?.id, 'state')
		assert.equal(nextPoll(new Date('2027-02-06T08:00:00Z')), null)
	})

	it('keeps INEC timetable dates in West Africa Time', () => {
		assert.deepEqual(GENERAL_ELECTION.polls.map((poll) => poll.opensAt), ['2027-01-16T08:30:00+01:00', '2027-02-06T08:30:00+01:00'])
	})

	it('lists the road to polling day in order, ending with the two polls', () => {
		const days = MILESTONES.map((item) => item.starts)
		assert.deepEqual(days, [...days].sort())
		assert.deepEqual(MILESTONES.slice(-2).map((item) => item.starts), GENERAL_ELECTION.polls.map((poll) => poll.opensAt.slice(0, 10)))
	})

	it('knows the eight off-cycle states, and that the other 28 elect governors on the general poll', () => {
		assert.equal(OFF_CYCLE.length, 8)
		const states = Object.keys(STATE_ZONES).filter((id) => id !== 'ng-fct')
		assert.equal(states.filter((id) => governorshipFor(id)?.offCycle === false).length, 28)
		assert.equal(governorshipFor('ng-fct'), null)
		assert.equal(governorshipFor('ng-kogi-state')?.offCycle, true)
	})
})
