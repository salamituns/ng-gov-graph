import Link from 'next/link'
import type { Trending } from '@/lib/graph/trending'

/**
 * "Trending this week": civic topics by this week's coverage, each opening its stories and the bodies involved.
 * With under two weeks of news it says "Most covered this week" instead: nothing can be rising yet.
 */
export function TrendingTopics({ gov, trending, heading }: { gov: string; trending: Trending; heading: string }) {
	if (!trending.topics.length) return null
	return (
		<section className="panel-card trending" aria-label={heading}>
			<h2>{heading}</h2>
			<ul className="trending-chips">
				{trending.topics.map((topic) => (
					<li key={topic.id}>
						<Link href={`/${gov}/topics/${topic.id}`} className={topic.rising ? 'is-rising' : undefined}>
							{topic.rising ? <span className="trending-rise" aria-label="rising">↑</span> : null}
							{topic.label}
							<span className="trending-count" aria-label={`${topic.coverage} stories from ${topic.outlets} outlets`}>{topic.coverage}</span>
						</Link>
					</li>
				))}
			</ul>
		</section>
	)
}
