'use client'

import type { CivicTopic } from '@/data/nigeria/topics'
import { trendingTopics } from '@/lib/graph/trending'
import { useGraphData } from '@/components/graph-data'
import { useClock } from '@/components/clock'

/** Weekly claims follow the browser clock, not the last page regeneration. */
export function TopicSummary({ topic, total }: { topic: CivicTopic; total: number }) {
	const { data } = useGraphData()
	const clock = useClock()
	const trend = data && clock ? trendingTopics(data.news, [topic], new Date(clock), 1).topics[0] : undefined
	return <>
		<p className="represent-zone">{trend?.rising ? 'Rising this week' : 'In the news'}</p>
		<h1>{topic.label}</h1>
		<p className="entity-description">{trend
			? `${trend.coverage} ${trend.coverage === 1 ? 'story' : 'stories'} from ${trend.outlets} outlets this week; ${total} in all.`
			: `${total} ${total === 1 ? 'story' : 'stories'} in the news we follow.`}</p>
	</>
}
