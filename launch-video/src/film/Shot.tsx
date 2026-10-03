import { Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Video } from '@remotion/media'
import { Cursor, type Point } from './Cursor'
import { BODY, COLORS, DISPLAY } from '../theme'

/** Clip pixels (the capture is 1600x900 CSS at 2x). */
const CLIP = { w: 3200, h: 1800 }
/** The browser window on the 1920x1080 stage. */
const WIN = { left: 140, top: 52, width: 1640, bar: 48 }
const BASE = WIN.width / CLIP.w

export type CameraKey = { t: number; scale: number; x: number; y: number }
export type Cue = { from: number; to: number; headline: string; detail?: string }
export type ShotLog = { pointer: Point[]; clicks: Point[]; urls: Array<{ t: number; url: string }> }
export type ShotProps = {
	clip: string
	log: ShotLog
	/** Seconds into the clip where the shot starts. */
	from: number
	camera: CameraKey[]
	cues: Cue[]
}

/** A scene from the live site in a browser window, with the real pointer, a moving camera and a caption. */
export function Shot({ clip, log, from, camera, cues }: ShotProps) {
	const frame = useCurrentFrame()
	const { fps } = useVideoConfig()
	const t = frame / fps + from
	const ease = { easing: Easing.bezier(0.65, 0, 0.35, 1), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
	const times = camera.map((key) => key.t)
	const at = (field: keyof CameraKey) => (camera.length > 1 ? interpolate(t, times, camera.map((key) => key[field]), ease) : camera[0][field])
	const s = at('scale')
	// Bring the focus toward the middle of the window, never past the page's edges.
	const tx = Math.min(0, Math.max(CLIP.w - CLIP.w * s, CLIP.w / 2 - at('x') * s))
	const ty = Math.min(0, Math.max(CLIP.h - CLIP.h * s, CLIP.h / 2 - at('y') * s))
	const url = [...log.urls].reverse().find((entry) => entry.t <= t)?.url ?? log.urls[0]?.url ?? ''
	const { durationInFrames } = useVideoConfig()
	const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 18 }) * interpolate(frame, [durationInFrames - 9, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
	const clicks = log.clicks.filter((click, index, all) => index === 0 || click.t - all[index - 1].t > 0.15)
	return (
		<>
			<div style={{ position: 'absolute', left: WIN.left, top: WIN.top, width: WIN.width, borderRadius: 18, overflow: 'hidden', background: '#f4f5f2', boxShadow: '0 40px 120px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.12)', opacity: enter, transform: `translateY(${(1 - enter) * 30}px) scale(${0.98 + enter * 0.02})` }}>
				<div style={{ height: WIN.bar, display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px', background: '#e7e9e4', borderBottom: '1px solid #d5d8d1' }}>
					{['#ff5f57', '#febc2e', '#28c840'].map((color) => <span key={color} style={{ width: 13, height: 13, borderRadius: 99, background: color }} />)}
					<div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
						<div style={{ minWidth: 560, padding: '7px 18px', borderRadius: 9, background: '#fff', fontFamily: BODY, fontWeight: 500, fontSize: 17, color: '#3d3a35', textAlign: 'center' }}>
							<span style={{ color: '#0a7046' }}>🔒 </span>
							{url.replace(/^https?:\/\//, '').replace(/\?view=budget$/, '')}
						</div>
					</div>
					<span style={{ width: 66 }} />
				</div>
				<div style={{ position: 'relative', width: WIN.width, height: CLIP.h * BASE, overflow: 'hidden' }}>
					<div style={{ position: 'absolute', width: CLIP.w, height: CLIP.h, transform: `scale(${BASE})`, transformOrigin: '0 0' }}>
						<div style={{ position: 'absolute', width: CLIP.w, height: CLIP.h, transform: `translate(${tx}px, ${ty}px) scale(${s})`, transformOrigin: '0 0' }}>
							<Video src={staticFile(`clips/${clip}.mp4`)} trimBefore={Math.round(from * fps)} muted style={{ width: CLIP.w, height: CLIP.h }} />
							<Cursor samples={log.pointer} clicks={clicks} offset={from} size={46 / Math.sqrt(s)} />
						</div>
					</div>
				</div>
			</div>
			{cues.map((cue) => <LowerCaption key={cue.headline} cue={cue} t={t} />)}
		</>
	)
}

/** A caption card over the lower left of the window: bold headline, supporting line a beat later. */
function LowerCaption({ cue, t }: { cue: Cue; t: number }) {
	const { fps } = useVideoConfig()
	const local = (t - cue.from) * fps
	const enter = spring({ frame: local, fps, config: { damping: 200 }, durationInFrames: 16 })
	const detail = spring({ frame: local - 7, fps, config: { damping: 200 }, durationInFrames: 16 })
	const leave = interpolate(t, [cue.to - 0.3, cue.to], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
	if (t < cue.from - 0.1 || t > cue.to + 0.05) return null
	return (
		<div style={{ position: 'absolute', left: 96, bottom: 70, maxWidth: 1040, padding: '26px 38px 30px', borderRadius: 24, background: 'rgba(4, 44, 29, 0.9)', boxShadow: '0 24px 60px rgba(0,0,0,.35)', borderLeft: `8px solid ${COLORS.mint}`, opacity: enter * leave, transform: `translateY(${(1 - enter) * 24}px)` }}>
			<div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 60, lineHeight: 1.04, letterSpacing: '-0.02em', color: COLORS.ink }}>{cue.headline}</div>
			{cue.detail ? <div style={{ marginTop: 10, fontFamily: BODY, fontWeight: 500, fontSize: 34, lineHeight: 1.25, color: COLORS.mint, opacity: detail }}>{cue.detail}</div> : null}
		</div>
	)
}
