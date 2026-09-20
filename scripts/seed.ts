import { persistNigeriaGraph } from '../src/lib/graph/persist'

persistNigeriaGraph({ liveNass: process.argv.includes('--live-nass') })
	.then((graph) => {
		console.log(
			`Seeded ng snapshot (${Object.keys(graph.nodes).length} nodes, ${Object.keys(graph.edges).length} edges)`,
		)
	})
	.catch((error: unknown) => {
		console.error(error)
		process.exit(1)
	})
