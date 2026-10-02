import type { NewsItem } from '@/data/nigeria/news'
import type { CivicTopic } from '@/data/nigeria/topics'
import { newsHeadline } from './news-text'
import { topicsOf } from './topics'

/** Government press offices: one of their releases is not one outlet's choice to cover a topic. */
const PRESS_OFFICES = /State House|Ministry of Information|National Assembly/i

const DAY = 86_400_000
const WEEK = 7 * DAY

export interface TopicTrend {
	id: string
	label: string
	/** This week's coverage: stories, a press office counting once per topic per day. */
	coverage: number
	outlets: number
	/** Gaining attention: this week against the weekly average of the three before. */
	rising: boolean
}

export interface Trending {
	topics: TopicTrend[]
	/**
	 * Whether the three weeks before carry enough news to rise against (on average, at least half this week's
	 * stories). Without it (a new feed, or a gap in collection) nothing is called rising: the list is "most
	 * covered" instead, rather than every topic surging against an empty baseline.
	 */
	hasHistory: boolean
}

function storyTime(item: NewsItem) {
	const time = item.publishedAt ? Date.parse(item.publishedAt) : NaN
	return Number.isFinite(time) ? time : null
}

/** Coverage of the stories given: press offices count once per day. */
function coverageOf(items: NewsItem[]) {
	const pressDays = new Set<string>()
	let count = 0
	for (const item of items) {
		if (PRESS_OFFICES.test(item.publication)) {
			const key = `${item.publication}|${item.publishedAt?.slice(0, 10)}`
			if (pressDays.has(key)) continue
			pressDays.add(key)
		}
		count += 1
	}
	return count
}

/** The stories of each topic, newest first. */
export function storiesByTopic(news: NewsItem[], topics: CivicTopic[]): Map<string, NewsItem[]> {
	const byTopic = new Map<string, NewsItem[]>(topics.map((topic) => [topic.id, []]))
	const dated = [...news].sort((a, b) => (storyTime(b) ?? 0) - (storyTime(a) ?? 0))
	for (const item of dated) {
		for (const id of topicsOf(newsHeadline(item), item.excerpt ?? '', topics)) byTopic.get(id)?.push(item)
	}
	return byTopic
}

/**
 * What the news is about this week. A topic needs two outlets to count (one outlet, or one press office, is
 * not a trend); it is rising when this week's coverage is at least one and a half times its weekly average over
 * the three weeks before, and at least three, provided those weeks were collected (hasHistory).
 */
export function trendingTopics(news: NewsItem[], topics: CivicTopic[], now: Date, limit = 6): Trending {
	const end = now.getTime()
	const times = news.map(storyTime).filter((time): time is number => time !== null)
	const thisWeek = times.filter((time) => time > end - WEEK && time <= end).length
	const weeksBefore = times.filter((time) => time > end - 4 * WEEK && time <= end - WEEK).length / 3
	const hasHistory = thisWeek > 0 && weeksBefore >= thisWeek / 2
	const byTopic = storiesByTopic(news, topics)
	const trends: TopicTrend[] = []
	for (const topic of topics) {
		const items = byTopic.get(topic.id) ?? []
		const week = items.filter((item) => {
			const time = storyTime(item)
			return time !== null && time > end - WEEK && time <= end
		})
		const before = items.filter((item) => {
			const time = storyTime(item)
			return time !== null && time > end - 4 * WEEK && time <= end - WEEK
		})
		const coverage = coverageOf(week)
		const outlets = new Set(week.map((item) => item.publication)).size
		if (outlets < 2) continue
		const baseline = coverageOf(before) / 3
		trends.push({ id: topic.id, label: topic.label, coverage, outlets, rising: hasHistory && coverage >= 3 && coverage >= 1.5 * baseline })
	}
	trends.sort((a, b) => Number(b.rising) - Number(a.rising) || b.coverage - a.coverage || b.outlets - a.outlets)
	return { topics: trends.slice(0, limit), hasHistory }
}
