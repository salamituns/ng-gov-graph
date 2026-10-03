import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLORS, SCREEN_SCALE } from './theme'

export interface TapMark {
	t: number
	x: number
	y: number
	kind?: 'swipe'
	dy?: number
	ms?: number
}

/** Where a finger touched the phone: a ripple for a tap, a travelling fingertip for a swipe. In screen coordinates. */
export function TapMarks({ taps }: { taps: TapMark[] }) {
	const frame = useCurrentFrame()
	const { fps } = useVideoConfig()
	const at = (x: number, y: number) => ({ left: x * SCREEN_SCALE, top: y * SCREEN_SCALE })
	return (
		<>
			{taps.map((tap, index) => {
				const local = frame - tap.t * fps
				if (tap.kind === 'swipe') {
					const length = ((tap.ms ?? 450) / 1000) * fps
					if (local < -4 || local > length + 10) return null
					const progress = interpolate(local, [0, length], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
					const opacity = interpolate(local, [-4, 0, length, length + 10], [0, 0.9, 0.9, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
					const p = at(tap.x, tap.y + (tap.dy ?? 0) * progress)
					return <div key={index} style={{ position: 'absolute', ...p, width: 70, height: 70, marginLeft: -35, marginTop: -35, borderRadius: 99, background: `${COLORS.tap}cc`, boxShadow: '0 4px 18px #0005', opacity }} />
				}
				if (local < -6 || local > 18) return null
				const press = interpolate(local, [-6, 0, 4], [0, 1, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
				const ring = interpolate(local, [0, 18], [0.4, 1.9], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
				const fade = interpolate(local, [0, 18], [0.9, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
				const p = at(tap.x, tap.y)
				return (
					<div key={index} style={{ position: 'absolute', ...p }}>
						<div style={{ position: 'absolute', width: 64, height: 64, marginLeft: -32, marginTop: -32, borderRadius: 99, background: `${COLORS.tap}bb`, boxShadow: '0 4px 18px #0005', opacity: press * (local < 6 ? 1 : fade) }} />
						<div style={{ position: 'absolute', width: 64, height: 64, marginLeft: -32, marginTop: -32, borderRadius: 99, border: `5px solid ${COLORS.tap}`, transform: `scale(${ring})`, opacity: fade }} />
					</div>
				)
			})}
		</>
	)
}
