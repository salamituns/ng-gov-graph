import { Fold } from '@/components/fold'
import { StoryImage } from '@/components/panel-client'
import type { NewsItem } from '@/data/nigeria/news'
import { decodeHtml, newsHeadline } from '@/lib/graph/news-text'

/** "punchng.com" for an http(s) link; empty for anything malformed or with another scheme. */
export function storyHost(url: string) {
	try {
		const parsed = new URL(url)
		return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.hostname.replace(/^www\./, '') : ''
	} catch {
		return ''
	}
}

/**
 * News stories as a list: headline, date, excerpt, source and image, the first six shown on phones. Only
 * http(s) links are rendered: a malformed or javascript: URL from a feed is dropped, not linked.
 */
export function StoryList({ stories, empty }: { stories: NewsItem[]; empty: string }) {
	const safe = stories.filter((item) => storyHost(item.url))
	if (!safe.length) return <p className="empty-box">{empty}</p>
	return (
		<Fold className="story-list" limit={6} showAll={`Show all ${safe.length} stories`}>
			{safe.map((item) => (
				<li key={item.id}>
					<div className="story-text">
						<a href={item.url} target="_blank" rel="noreferrer">
							<h3>{newsHeadline(item)}</h3>
						</a>
						{item.publishedAt ? <time dateTime={item.publishedAt}>{new Date(`${item.publishedAt.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</time> : null}
						{item.excerpt ? <p>{decodeHtml(item.excerpt).slice(0, 260)}</p> : null}
						<a href={item.url} target="_blank" rel="noreferrer" className="source-pill">{storyHost(item.url)} ↗</a>
					</div>
					<a href={item.url} target="_blank" rel="noreferrer" className="story-image" aria-hidden="true" tabIndex={-1}>
						<StoryImage src={item.imageUrl} />
					</a>
				</li>
			))}
		</Fold>
	)
}
