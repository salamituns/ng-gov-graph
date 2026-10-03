import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { BODY, COLORS, DISPLAY } from '../theme'

/** Words rise in one after another, then the card fades as the next scene arrives. */
export function TitleCard({ lines, size = 132 }: { lines: string[]; size?: number }) {
	const frame = useCurrentFrame()
	const { fps, durationInFrames } = useVideoConfig()
	const out = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
	let index = 0
	return (
		<div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: out }}>
			{lines.map((line) => (
				<div key={line} style={{ display: 'flex', gap: '0.26em', fontFamily: DISPLAY, fontWeight: 800, fontSize: size, letterSpacing: '-0.03em', color: COLORS.ink, lineHeight: 1.05 }}>
					{line.split(' ').map((word) => {
						const delay = 4 + index++ * 4
						const s = spring({ frame: frame - delay, fps, config: { damping: 15, mass: 0.7 } })
						return <span key={word + delay} style={{ display: 'inline-block', opacity: Math.min(1, s * 1.4), transform: `translateY(${(1 - s) * 50}px)` }}>{word}</span>
					})}
				</div>
			))}
		</div>
	)
}

/** The call to action: the question people should leave with, then where to find the answer. */
export function EndCard({ compact = false }: { compact?: boolean }) {
	const big = compact ? 92 : 104
	const frame = useCurrentFrame()
	const { fps } = useVideoConfig()
	const a = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 18 })
	const b = spring({ frame: frame - 18, fps, config: { damping: 14, mass: 0.7 } })
	const c = spring({ frame: frame - 34, fps, config: { damping: 200 }, durationInFrames: 18 })
	const d = spring({ frame: frame - 48, fps, config: { damping: 200 }, durationInFrames: 18 })
	return (
		<div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
			<div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: big, letterSpacing: '-0.03em', color: COLORS.ink, textAlign: 'center', lineHeight: 1.05, opacity: a, transform: `translateY(${(1 - a) * 30}px)` }}>{compact ? <>Who runs<br />your state?</> : 'Who runs your state?'}</div>
			<div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: big, letterSpacing: '-0.03em', color: COLORS.mint, opacity: Math.min(1, b * 1.3), transform: `scale(${0.9 + b * 0.1})` }}>Find out.</div>
			<div style={{ marginTop: 56, display: 'flex', alignItems: 'center', gap: 22, padding: '22px 40px', borderRadius: 999, background: COLORS.ink, opacity: c, transform: `translateY(${(1 - c) * 20}px)` }}>
				<Img src={staticFile('icon.svg')} style={{ width: 56, height: 56 }} />
				<span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 60, color: COLORS.bandDeep, letterSpacing: '-0.02em' }}>whoruns9ja.com</span>
			</div>
			<div style={{ marginTop: 34, maxWidth: compact ? 860 : undefined, textAlign: 'center', fontFamily: BODY, fontWeight: 500, fontSize: compact ? 38 : 34, lineHeight: 1.35, color: COLORS.mint, opacity: d }}>
				Free · Every fact sourced · English, Pidgin, Hausa, Yorùbá, Igbo
			</div>
		</div>
	)
}
