import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { BODY, COLORS, DISPLAY, LAYOUT } from './theme'

export interface CaptionCue {
	/** Seconds into the scene. */
	from: number
	to: number
	headline: string
	detail?: string
}

/** One caption in the green band: a bold headline, then a supporting line a beat later. */
export function Caption({ cue }: { cue: CaptionCue }) {
	const frame = useCurrentFrame()
	const { fps } = useVideoConfig()
	const start = cue.from * fps
	const end = cue.to * fps
	const enter = spring({ frame: frame - start, fps, config: { damping: 200 }, durationInFrames: 14 })
	const enterDetail = spring({ frame: frame - start - 8, fps, config: { damping: 200 }, durationInFrames: 14 })
	const leave = interpolate(frame, [end - 8, end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
	return (
		<div style={{ position: 'absolute', inset: 0, height: LAYOUT.bandHeight, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 64px 20px', gap: 18, opacity: leave }}>
			<div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: cue.headline.length > 30 ? 66 : 78, lineHeight: 1.02, letterSpacing: '-0.02em', color: COLORS.ink, opacity: enter, transform: `translateY(${(1 - enter) * 26}px)` }}>
				{cue.headline}
			</div>
			{cue.detail ? (
				<div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 42, lineHeight: 1.22, color: COLORS.mint, opacity: enterDetail, transform: `translateY(${(1 - enterDetail) * 18}px)` }}>
					{cue.detail}
				</div>
			) : null}
		</div>
	)
}
