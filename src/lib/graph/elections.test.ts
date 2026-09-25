import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { GENERAL_ELECTION, nextPoll } from '@/data/nigeria/elections'

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
})
