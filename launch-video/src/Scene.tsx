import { AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Video } from '@remotion/media'
import { Caption, type CaptionCue } from './Caption'
import { TapMarks, type TapMark } from './TapMarks'
import { COLORS, LAYOUT, SCREEN_LEFT, SCREEN_SCALE, SCREEN_WIDTH } from './theme'

export type SceneProps = {
	clip: string
	taps: TapMark[]
	captions: CaptionCue[]
	/** Seconds of the clip to skip at the start. */
	trim?: number
	/** Camera keyframes: at `t` seconds, zoom to `scale` around (x, y) in clip pixels (1080x1920). */
	camera?: Array<{ t: number; scale: number; x: number; y: number }>
}

/** A recorded clip from the live site, framed as a phone screen under the caption band. */
export function Scene({ clip, taps, captions, trim = 0, camera = [] }: SceneProps) {
	const frame = useCurrentFrame()
	const { fps } = useVideoConfig()
	const keys = camera.length ? camera : [{ t: 0, scale: 1, x: 540, y: 960 }]
	const times = keys.map((key) => key.t * fps)
	const ease = { easing: Easing.inOut(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
	const pick = (field: 'scale' | 'x' | 'y') => (keys.length > 1 ? interpolate(frame, times, keys.map((key) => key[field]), ease) : keys[0][field])
	const scale = pick('scale')
	const origin = `${pick('x') * SCREEN_SCALE}px ${pick('y') * SCREEN_SCALE}px`
	return (
		<AbsoluteFill style={{ background: `linear-gradient(180deg, ${COLORS.band} 0%, ${COLORS.bandDeep} 100%)` }}>
			<div style={{ position: 'absolute', left: SCREEN_LEFT, top: LAYOUT.screen.top, width: SCREEN_WIDTH, height: LAYOUT.screen.height, borderRadius: LAYOUT.screen.radius, overflow: 'hidden', boxShadow: '0 30px 80px #0007, 0 0 0 6px #ffffff22' }}>
				{/* The camera moves the recording and its finger marks together, so a ripple stays on its tap. */}
				<div style={{ position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: origin }}>
					<Video src={staticFile(`clips/${clip}.mp4`)} trimBefore={Math.round(trim * fps)} muted style={{ width: '100%', height: '100%' }} />
					<TapMarks taps={taps.map((tap) => ({ ...tap, t: tap.t - trim }))} />
				</div>
			</div>
			{captions.map((cue) => <Caption key={cue.headline} cue={cue} />)}
		</AbsoluteFill>
	)
}
