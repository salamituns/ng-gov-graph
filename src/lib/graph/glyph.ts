import type { NodeType } from './types'

/** Entity glyphs follow the CivLab legend so the two maps read the same way. */
export function glyphPath(type: NodeType, x: number, y: number, r: number) {
	const point = (dx: number, dy: number) => `${round(x + dx * r)} ${round(y + dy * r)}`
	const polygon = (sides: number, rotation: number) =>
		`M ${Array.from({ length: sides }, (_, index) => {
			const angle = rotation + (index * Math.PI * 2) / sides
			return point(Math.cos(angle), Math.sin(angle))
		}).join(' L ')} Z`
	const rounded = (size: number, radius: number) => {
		const s = size
		const k = radius
		return `M ${point(-s + k, -s)} L ${point(s - k, -s)} Q ${point(s, -s)} ${point(s, -s + k)} L ${point(s, s - k)} Q ${point(s, s)} ${point(s - k, s)} L ${point(-s + k, s)} Q ${point(-s, s)} ${point(-s, s - k)} L ${point(-s, -s + k)} Q ${point(-s, -s)} ${point(-s + k, -s)} Z`
	}
	switch (type) {
		case 'department':
			return rounded(0.9, 0.3)
		case 'commission':
			return polygon(4, -Math.PI / 2)
		case 'advisory':
			return polygon(6, -Math.PI / 2)
		case 'court':
			return polygon(5, -Math.PI / 2)
		case 'corporation':
			return `${rounded(0.95, 0.12)} ${rounded(0.55, 0.08)}`
		case 'state':
			return `M ${point(-0.9, -0.85)} L ${point(0.9, -0.85)} L ${point(0.9, 0.25)} Q ${point(0.9, 0.8)} ${point(0, 1)} Q ${point(-0.9, 0.8)} ${point(-0.9, 0.25)} Z`
		default:
			return `M ${point(0, -1)} A ${round(r)} ${round(r)} 0 1 1 ${point(0, 1)} A ${round(r)} ${round(r)} 0 1 1 ${point(0, -1)} Z`
	}
}

/** The small head seat drawn on an organization: filled when occupied, hollow when vacant. */
export function seatOffset(r: number) {
	return { dx: r * 0.72, dy: -r * 0.92, r: Math.max(2.4, r * 0.38) }
}

/** The People of Nigeria hub is a scalloped seal rather than a plain circle. */
export function sealPath(cx: number, cy: number, r: number, bumps = 22) {
	const steps = bumps * 8
	return `M ${Array.from({ length: steps }, (_, index) => {
		const angle = (index / steps) * Math.PI * 2
		const radius = r + Math.cos(angle * bumps) * r * 0.045
		return `${round(cx + Math.cos(angle) * radius)} ${round(cy + Math.sin(angle) * radius)}`
	}).join(' L ')} Z`
}

function round(value: number) {
	return Math.round(value * 100) / 100
}
