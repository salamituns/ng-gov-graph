import { Explorer } from '@/components/explorer'
import { filterGraph, parseLayer } from '@/lib/graph/filter'
import { summarizeOverview } from '@/lib/graph/overview'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'
import { powerMap, powerSlice, type PowerWindow } from '@/lib/graph/power'

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
	const view = viewParam === 'people' ? 'people' : viewParam === 'power' ? 'power' : 'orgs'
	const days = powerWindow(daysParam)
	const data = await loadNigeriaGraph()
	const filtered = filterGraph(data.graph, layer)
	const mentions = powerMap(data.news, days, new Date())
	const graph = view === 'power' ? powerSlice(filtered, mentions) : filtered
	return (
		<Explorer
			gov={data.gov}
			title="Nigeria Gov Graph"
			graph={graph}
			searchIndex={data.graph}
			layer={layer}
			view={view}
			overview={summarizeOverview(filtered)}
			changes={data.changes}
			news={data.news}
			newsSource={data.newsSource}
			changesSource={data.changesSource}
			source={data.source}
			powerDays={days}
			powerMentions={mentions}
		/>
	)
}
