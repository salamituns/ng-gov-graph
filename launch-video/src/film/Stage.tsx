import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { COLORS } from '../theme'

/** The film's backdrop: deep flag green with the map's own concentric rings, slowly turning. */
export function Stage({ children }: { children?: React.ReactNode }) {
	const frame = useCurrentFrame()
	const turn = interpolate(frame, [0, 1800], [0, 30])
	return (
		<AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 40%, ${COLORS.band} 0%, ${COLORS.bandDeep} 55%, #033a26 100%)`, overflow: 'hidden' }}>
			<svg viewBox="-500 -500 1000 1000" style={{ position: 'absolute', left: '50%', top: '50%', width: 2400, height: 2400, marginLeft: -1200, marginTop: -1200, opacity: 0.09, transform: `rotate(${turn}deg)` }}>
				{[130, 210, 290, 370, 450].map((r) => <circle key={r} r={r} fill="none" stroke={COLORS.ink} strokeWidth={1.4} strokeDasharray={r % 160 === 130 ? '4 10' : undefined} />)}
			</svg>
			{children}
		</AbsoluteFill>
	)
}
