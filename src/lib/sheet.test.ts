import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { snapFor } from './sheet'

describe('bottom sheet snaps', () => {
	it('opens reading pages fully', () => {
		assert.equal(snapFor('/ng/represent/lagos', null), 'full')
		assert.equal(snapFor('/ng/elections', null), 'full')
		assert.equal(snapFor('/ng/budget', null), 'full')
		assert.equal(snapFor('/ng/federal-character', null), 'full')
	})

	it('opens a body halfway, with the map still in view', () => {
		assert.equal(snapFor('/ng/departments/ng-ministry-of-works', null), 'half')
		assert.equal(snapFor('/ng/elected/ng-president', null), 'half')
	})

	it('keeps the sheet low at home and in map-first views', () => {
		assert.equal(snapFor('/ng', null), 'peek')
		assert.equal(snapFor('/ng', 'budget'), 'peek')
		assert.equal(snapFor('/ng/departments/ng-ministry-of-works', 'budget'), 'peek')
		assert.equal(snapFor('/ng', 'newsmakers'), 'peek')
	})

	it('raises the sheet for a jump to a home section', () => {
		assert.equal(snapFor('/ng', null, '#represent'), 'half')
	})
})
