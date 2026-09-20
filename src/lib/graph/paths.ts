import type { GraphNode, NodeType } from './types'

const TYPE_PATH: Partial<Record<NodeType, string>> = {
	department: 'departments',
	elected: 'elected',
	commission: 'commissions',
	advisory: 'advisories',
	dept_head: 'dept-heads',
	court: 'courts',
	corporation: 'corporations',
	state: 'states',
}

export function nodePath(gov: string, node: GraphNode): string {
	if (node.type === 'constituency') {
		return `/${gov}`
	}
	const segment = TYPE_PATH[node.type] ?? 'departments'
	return `/${gov}/${segment}/${node.id}`
}
