import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { NewsItem } from '@/data/nigeria/news'
import { trendingTopics } from './trending'

const NOW = new Date('2026-10-02T12:00:00Z')
const TOPICS = [
	{ id: 'fuel', label: 'Fuel prices', keywords: ['petrol'], bodies: [] },
	{ id: 'floods', label: 'Floods', keywords: ['flood'], bodies: [] },
]
let n = 0
function story(headline: string, publication: string, daysAgo: number): NewsItem {
	const publishedAt = new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString()
	return { id: `s${n++}`, summary: headline, url: `https://example.org/${n}`, publication, publishedAt }
}
/** Three weeks of other news, as many stories a week as the tests put in this week. */
const history = [8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27].map((d) => story('Senate resumes', 'Punch', d))

describe('trending topics', () => {
	it('needs two outlets: one paper, or one press office, is not a trend', () => {
		const news = [...history, story('Petrol queues return', 'Punch', 1), story('Petrol price up', 'Punch', 2)]
		assert.deepEqual(trendingTopics(news, TOPICS, NOW).topics, [])
	})

	it('counts a press office once per topic per day', () => {
		const news = [
			...history,
			story('Petrol: FG acts', 'The State House, Abuja', 1),
			story('Petrol: FG acts again', 'The State House, Abuja', 1),
			story('Petrol: FG acts once more', 'The State House, Abuja', 1),
			story('Petrol prices bite', 'Daily Trust', 2),
		]
		const [fuel] = trendingTopics(news, TOPICS, NOW).topics
		assert.equal(fuel.coverage, 2)
		assert.equal(fuel.outlets, 2)
	})

	it('marks a topic rising against its own last three weeks', () => {
		const news = [
			...history,
			...[1, 2, 3, 4].map((d) => story('Petrol scarcity', d % 2 ? 'Punch' : 'Vanguard', d)),
			story('Flood in Bauchi', 'Punch', 1), story('Flood in Kogi', 'Vanguard', 2), story('Flood warning', 'Punch', 3),
			...[9, 10, 12, 15, 16, 18, 19].map((d) => story('Flood season', d % 2 ? 'Punch' : 'Vanguard', d)),
		]
		const { topics } = trendingTopics(news, TOPICS, NOW)
		assert.deepEqual(topics.map((t) => [t.id, t.rising]), [['fuel', true], ['floods', false]])
	})

	it('claims nothing is rising without history to rise against', () => {
		const news = [story('Petrol scarcity', 'Punch', 1), story('Petrol queues', 'Vanguard', 2), story('Petrol price', 'Punch', 3)]
		const result = trendingTopics(news, TOPICS, NOW)
		assert.equal(result.hasHistory, false)
		assert.equal(result.topics[0].rising, false)
	})

	it('a gap in collection is not history: a few old stories against a busy week', () => {
		const busyWeek = Array.from({ length: 30 }, (_, i) => story(i < 4 ? 'Petrol scarcity' : 'Senate sits', i % 2 ? 'Punch' : 'Vanguard', 1 + (i % 6)))
		const result = trendingTopics([...busyWeek, story('Senate resumes', 'Punch', 25)], TOPICS, NOW)
		assert.equal(result.hasHistory, false)
		assert.ok(result.topics.every((topic) => !topic.rising))
	})
})
