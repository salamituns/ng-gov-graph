import { Explorer } from '@/components/explorer'
import { filterGraph, parseLayer } from '@/lib/graph/filter'
import { summarizeOverview } from '@/lib/graph/overview'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { changesInWindow } from '@/lib/graph/feed'
import { peopleInNews, powerMap, type PowerWindow } from '@/lib/graph/power'

interface PageProps {
	searchParams: Promise<{ layer?: string; view?: string; days?: string }>
}

function powerWindow(value: string | undefined): PowerWindow {
	if (value === '7' || value === '90') {
		return Number(value) as PowerWindow
	}
	return 30
}

export default async function NigeriaGraphPage({ searchParams }: PageProps) {
	const { layer: layerParam, view: viewParam, days: daysParam } = await searchParams
	const layer = parseLayer(layerParam)
	const view =
		viewParam === 'people'
			? 'people'
			: viewParam === 'news' || viewParam === 'power'
				? 'news'
				: 'orgs'
	const days = powerWindow(daysParam)
	const data = await loadNigeriaGraph()
	const filtered = filterGraph(data.graph, layer)
	const mentions = powerMap(data.news, days, new Date()).filter((item) => filtered.nodes[item.id])
	const graph = filtered
	const now = new Date()
	const latestChange = [...data.changes].sort((a, b) => b.date.localeCompare(a.date))[0]
	return (
		<Explorer
			gov={data.gov}
			title="Nigeria Gov Graph"
			graph={graph}
			searchIndex={data.graph}
			layer={layer}
			view={view}
			overview={summarizeOverview(filtered)}
			changes={changesInWindow(data.changes, days, now)}
			earlierChanges={data.changes.filter(
				(change) => !changesInWindow(data.changes, days, now).some((item) => item.id === change.id),
			)}
			news={data.news}
			newsSource={data.newsSource}
			changesSource={data.changesSource}
			source={data.source}
			powerDays={days}
			powerMentions={mentions}
			newsPeople={peopleInNews(filtered, mentions)}
			latestChange={latestChange}
			asOf={now.toISOString().slice(0, 10)}
		/>
	)
}
