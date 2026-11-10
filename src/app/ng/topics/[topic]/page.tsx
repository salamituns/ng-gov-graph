import { TopicSummary } from '@/components/topic-summary'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BrandBar } from '@/components/brand-bar'
import { SeeOn } from '@/components/see-on-map'
import { StoryList } from '@/components/story-list'
import { TopicSpotlight } from '@/components/topic-spotlight'
import { CIVIC_TOPICS } from '@/data/nigeria/topics'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { nodePath } from '@/lib/graph/paths'
import { storiesByTopic } from '@/lib/graph/trending'

interface PageProps {
	params: Promise<{ topic: string }>
}

/** None at build time: each page is rendered on its first visit, then cached (until the stored-data tag is invalidated). */
export function generateStaticParams() {
	return []
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
	const bodies = topic.bodies.map((id) => graph.nodes[id]).filter((node) => node)

	return (
		<>
			<BrandBar crumbs={[{ label: 'Trending' }, { label: topic.label }]} />
			<TopicSpotlight label={topic.label} bodyIds={bodies.map((node) => node.id)} />
			<article className="panel-card entity-card">
				<TopicSummary topic={topic} total={stories.length} />
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
