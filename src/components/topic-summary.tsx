import type { CivicTopic } from '@/data/nigeria/topics'
import type { TopicTrend } from '@/lib/graph/trending'

/** Weekly coverage is present in cached HTML, refreshed daily or by the 24-hour backstop. */
export function TopicSummary({ topic, total, trend }: { topic: CivicTopic; total: number; trend?: TopicTrend }) {
	return <>
		<p className="represent-zone">{trend?.rising ? 'Rising this week' : 'In the news'}</p>
		<h1>{topic.label}</h1>
		<p className="entity-description">{trend
			? `${trend.coverage} ${trend.coverage === 1 ? 'story' : 'stories'} from ${trend.outlets} outlets this week; ${total} in all.`
			: `${total} ${total === 1 ? 'story' : 'stories'} in the news we follow.`}</p>
	</>
}
