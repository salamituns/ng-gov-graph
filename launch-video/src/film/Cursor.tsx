import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'

export type Point = { t: number; x: number; y: number }

/** Where the pointer was at `t`: between logged samples it moves in a straight line, as it did. */
export function pointerAt(samples: Point[], t: number): Point {
	if (!samples.length) return { t, x: 0, y: 0 }
	if (t <= samples[0].t) return samples[0]
	for (let i = 1; i < samples.length; i++) {
		const b = samples[i]
		if (t <= b.t) {
			const a = samples[i - 1]
			const k = (t - a.t) / Math.max(1e-6, b.t - a.t)
			return { t, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
		}
	}
	return samples[samples.length - 1]
}

/** A macOS-style arrow drawn from the capture log, with a press and ripple on each click. In clip pixels. */
export function Cursor({ samples, clicks, offset = 0, size = 46 }: { samples: Point[]; clicks: Point[]; offset?: number; size?: number }) {
	const frame = useCurrentFrame()
	const { fps } = useVideoConfig()
	const t = frame / fps + offset
	const p = pointerAt(samples, t)
	const click = clicks.find((c) => t >= c.t - 0.05 && t <= c.t + 0.6)
	const since = click ? t - click.t : 1
	const press = click ? interpolate(since, [-0.05, 0.05, 0.2], [1, 0.82, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1
	return (
		<>
			{click ? (
				<div style={{ position: 'absolute', left: click.x, top: click.y, width: 0, height: 0 }}>
					<div style={{ position: 'absolute', width: 120, height: 120, marginLeft: -60, marginTop: -60, borderRadius: 999, border: '6px solid #0a7046', opacity: interpolate(since, [0, 0.55], [0.85, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), transform: `scale(${interpolate(since, [0, 0.55], [0.3, 1.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})` }} />
				</div>
			) : null}
			<svg viewBox="0 0 24 24" width={size} height={size} style={{ position: 'absolute', left: p.x - size * 0.16, top: p.y - size * 0.08, transform: `scale(${press})`, transformOrigin: '16% 8%', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.35))' }}>
				<path d="M4 2 L4 19 L8.6 14.9 L11.7 21.6 L14.6 20.3 L11.5 13.8 L17.6 13.8 Z" fill="#111" stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
			</svg>
		</>
	)
}
