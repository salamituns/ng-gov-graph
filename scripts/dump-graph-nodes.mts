// Prints the federal graph's bodies as JSON, for scripts that match external data to node ids.
import { compileNigeriaGraph } from '../src/lib/graph/nigeria'

const graph = compileNigeriaGraph()
const bodies = Object.values(graph.nodes)
	.filter((node) => node.type !== 'dept_head' && node.type !== 'constituency')
	.map((node) => ({ id: node.id, name: node.name, aliases: node.aliases, parentId: node.parentId }))
console.log(JSON.stringify(bodies))
process.exit(0)
