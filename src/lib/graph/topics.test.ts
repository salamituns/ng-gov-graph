import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { keywordPattern, topicsOf } from './topics'

describe('topic keywords', () => {
	it('lowercase matches the start of a word, in any case', () => {
		assert.ok(keywordPattern('bandit').test('Banditry rises in Zamfara'))
		assert.ok(keywordPattern('fuel price').test('Fuel prices climb again'))
		assert.ok(!keywordPattern('bandit').test('Contrabandits'))
	})

	it('a Name matches the whole phrase, in any case', () => {
		assert.ok(keywordPattern('Dangote refinery').test('Dangote Refinery cuts petrol price'))
		assert.ok(!keywordPattern('Lassa').test('Lassaland'))
	})

	it('an ACRONYM matches exactly, as a whole word', () => {
		assert.ok(keywordPattern('VAT').test('FG raises VAT to 10%'))
		assert.ok(!keywordPattern('VAT').test('private firms'))
		assert.ok(!keywordPattern('NIN').test('Nineteen states'))
		assert.ok(!keywordPattern('NIN').test('nin enrolment'))
	})

	it('finds every topic a headline belongs to', () => {
		const topics = [
			{ id: 'fuel', label: 'Fuel', keywords: ['petrol'], bodies: [] },
			{ id: 'tax', label: 'Tax', keywords: ['VAT', 'taxes'], bodies: [] },
			{ id: 'insecurity', label: 'Insecurity', keywords: ['bandit'], bodies: [] },
		]
		assert.deepEqual(topicsOf('VAT on petrol imports rises', '', topics), ['fuel', 'tax'])
		assert.deepEqual(topicsOf('Senate confirms new ambassadors', '', topics), [])
	})

	it('needs two keywords when only the excerpt matches', () => {
		const topics = [{ id: 'fuel', label: 'Fuel', keywords: ['petrol', 'pump price'], bodies: [] }]
		assert.deepEqual(topicsOf('Fire service saves N35m property', 'A tanker of petrol caught fire.', topics), [])
		assert.deepEqual(topicsOf('Marketers react', 'The pump price of petrol rose again.', topics), ['fuel'])
	})
})
