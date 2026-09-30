import type { GraphNode } from './types'

/** Cabinet seats: every minister and minister of state, and the Attorney-General. */
export function isCabinetSeat(node: GraphNode) {
	return node.type === 'dept_head' && (node.id.startsWith('ng-minister-of-') || node.id === 'ng-attorney-general')
}
