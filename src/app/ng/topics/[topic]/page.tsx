import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BrandBar } from '@/components/brand-bar'
import { SeeOn } from '@/components/see-on-map'
import { StoryList } from '@/components/story-list'
import { TopicSpotlight } from '@/components/topic-spotlight'
import { CIVIC_TOPICS } from '@/data/nigeria/topics'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { nodePath } from '@/lib/graph/paths'
import { storiesByTopic, trendingTopics } from '@/lib/graph/trending'

interface PageProps {
	params: Promise<{ topic: string }>
}

export async function generateMetadata({ params }: PageProps) {
	const { topic: id } = await params
	const topic = CIVIC_TOPICS.find((item) => item.id === id)
	return { title: topic ? `${topic.label} · Who Runs Naija` : 'Who Runs Naija' }
}

/** A trending topic: this week's coverage, the bodies it involves (lit on the map) and its stories. */
export default async function TopicPage({ params }: PageProps) {
	const { topic: id } = await params
	const topic = CIVIC_TOPICS.find((item) => item.id === id)
	if (!topic) notFound()
	const { gov, graph, news } = await loadNigeriaGraph()
	const stories = storiesByTopic(news, [topic]).get(topic.id) ?? []
	const trend = trendingTopics(news, [topic], new Date(), 1).topics[0]
	const bodies = topic.bodies.map((id) => graph.nodes[id]).filter((node) => node)

	return (
		<>
			<BrandBar crumbs={[{ label: 'Trending' }, { label: topic.label }]} />
			<TopicSpotlight label={topic.label} bodyIds={bodies.map((node) => node.id)} />
			<article className="panel-card entity-card">
				<p className="represent-zone">{trend?.rising ? 'Rising this week' : 'In the news'}</p>
				<h1>{topic.label}</h1>
				<p className="entity-description">
					{trend
						? `${trend.coverage} ${trend.coverage === 1 ? 'story' : 'stories'} from ${trend.outlets} outlets this week; ${stories.length} in all.`
						: `${stories.length} ${stories.length === 1 ? 'story' : 'stories'} in the news we follow.`}
				</p>
				{bodies.length ? (
					<>
						<p className="entity-seat-title">Who is responsible</p>
						<ul className="topic-bodies">
							{bodies.map((node) => (
								<li key={node.id}>
									<Link href={nodePath(gov, node)} className="entity-link">{node.name}</Link>
								</li>
							))}
						</ul>
						<SeeOn />
					</>
				) : null}
				<p className="muted-copy topic-keywords">
					Stories are matched by their headline: {topic.keywords.join(', ')}.
				</p>
			</article>

			<section className="panel-card">
				<h2>Stories</h2>
				<StoryList stories={stories} empty="No story on this topic yet." />
			</section>
		</>
	)
}
