import type { NodeType } from './types'

export function glyphPath(type: NodeType, x: number, y: number, r: number) {
	const point = (dx: number, dy: number) => `${x + dx * r} ${y + dy * r}`
	if (type === 'elected')
		return `M ${point(-1, -0.6)} Q ${point(-1, -1)} ${point(-0.6, -1)} L ${point(0.6, -1)} Q ${point(1, -1)} ${point(1, -0.6)} L ${point(1, 0.6)} Q ${point(1, 1)} ${point(0.6, 1)} L ${point(-0.6, 1)} Q ${point(-1, 1)} ${point(-1, 0.6)} Z`
	if (type === 'department')
		return `M ${point(-0.85, -1)} L ${point(0.85, -1)} L ${point(1, -0.55)} L ${point(1, 1)} L ${point(-1, 1)} L ${point(-1, -0.55)} Z`
	if (type === 'commission')
		return `M ${point(0, -1)} L ${point(0.87, -0.5)} L ${point(0.87, 0.5)} L ${point(0, 1)} L ${point(-0.87, 0.5)} L ${point(-0.87, -0.5)} Z`
	if (type === 'advisory')
		return `M ${point(0, -1)} L ${point(1, 0)} L ${point(0, 1)} L ${point(-1, 0)} Z`
	if (type === 'court')
		return `M ${point(0, -1)} L ${point(0.95, -0.3)} L ${point(0.6, 1)} L ${point(-0.6, 1)} L ${point(-0.95, -0.3)} Z`
	if (type === 'corporation')
		return `M ${point(-1, -1)} L ${point(1, -1)} L ${point(1, 1)} L ${point(-1, 1)} Z`
	return `M ${point(0, -1)} A ${r} ${r} 0 1 1 ${point(0, 1)} A ${r} ${r} 0 1 1 ${point(0, -1)} Z`
}
