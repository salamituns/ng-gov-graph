import { Explorer } from '@/components/explorer'
import { filterGraph, parseLayer } from '@/lib/graph/filter'
import { summarizeOverview } from '@/lib/graph/overview'
import { loadNigeriaGraph } from '@/lib/graph/nigeria'

interface PageProps {
	searchParams: Promise<{ layer?: string; view?: string }>
}

export default async function NigeriaGraphPage({ searchParams }: PageProps) {
	const { layer: layerParam, view: viewParam } = await searchParams
	const layer = parseLayer(layerParam)
	const view = viewParam === 'people' ? 'people' : 'orgs'
	const data = await loadNigeriaGraph()
	const graph = filterGraph(data.graph, layer)
	return (
		<Explorer
			gov={data.gov}
			title="Nigeria Gov Graph"
			graph={graph}
			searchIndex={data.graph}
			layer={layer}
			view={view}
			overview={summarizeOverview(graph)}
			changes={data.changes}
			news={data.news}
			source={data.source}
		/>
	)
}
