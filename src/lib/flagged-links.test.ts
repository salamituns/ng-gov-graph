import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isFlaggedUrl } from './flagged-links'

describe('flagged links', () => {
	it('flags a listed host and its subdomains', () => {
		assert.equal(isFlaggedUrl('https://www.ninlan.edu.ng/about-us/'), true)
		assert.equal(isFlaggedUrl('https://ninlan.edu.ng'), true)
		assert.equal(isFlaggedUrl('http://portal.NINLAN.edu.ng./x'), true)
	})
	it('leaves look-alike and unrelated hosts alone', () => {
		assert.equal(isFlaggedUrl('https://notninlan.edu.ng/'), false)
		assert.equal(isFlaggedUrl('https://ninlan.edu.ng.example.com/'), false)
		assert.equal(isFlaggedUrl('https://www.nuc.edu.ng/'), false)
	})
	it('treats missing or malformed URLs as not flagged', () => {
		assert.equal(isFlaggedUrl(undefined), false)
		assert.equal(isFlaggedUrl(''), false)
		assert.equal(isFlaggedUrl('not a url'), false)
	})
})
