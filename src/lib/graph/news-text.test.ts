import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { newsLead } from './news-text'

const story = (excerpt: string, summary = 'Court Nullifies APC Primary In Gombe') => ({
	id: 'x', url: 'https://example.ng/story', publication: 'example', summary, excerpt,
})

describe('news leads', () => {
	it('does not end the lead at a middle initial or a title', () => {
		assert.equal(
			newsLead(story('A Federal High Court in Gombe has nullified the APC primary that produced J. Abubakar as candidate. The party said it would appeal.')),
			'A Federal High Court in Gombe has nullified the APC primary that produced J. Abubakar as candidate.',
		)
		assert.match(newsLead(story('The Minister of Defence, Gen. Christopher Musa, has visited troops in Borno State. More follows.')), /Gen\. Christopher Musa, has visited troops/)
	})

	it('falls back to the headline when the feed cut the excerpt off mid-sentence', () => {
		assert.equal(newsLead(story('The Lagos State Government has recognised frontline officers for their roles in responding to domestic and sexual vio', 'Lagos Honours Frontline Responders')), 'Lagos Honours Frontline Responders')
		assert.equal(newsLead(story('Over 40,000 farmers in Abia State have endorsed the PDP candidate, citing his agricultural policies', 'Abia Farmers Back PDP Candidate')), 'Abia Farmers Back PDP Candidate')
	})

	it('keeps a complete first sentence', () => {
		assert.equal(newsLead(story('The Central Bank of Nigeria has cut its benchmark rate by 350 basis points to 23%. Analysts welcomed it.')), 'The Central Bank of Nigeria has cut its benchmark rate by 350 basis points to 23%.')
	})
})
