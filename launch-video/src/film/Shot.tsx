import { Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Video } from '@remotion/media'
import { Cursor, type Point } from './Cursor'
import { BODY, COLORS, DISPLAY } from '../theme'

/** Clip pixels (the capture is 1600x900 CSS at 2x). */
const CLIP = { w: 3200, h: 1800 }
/** Where the browser window sits on each stage, and how tall its page area is. */
export const WINDOWS = {
	landscape: { left: 140, top: 52, width: 1640, height: 1640 * (CLIP.h / CLIP.w), bar: 48 },
	// Portrait shows about half the page; the camera picks which half.
	portrait: { left: 40, top: 500, width: 1000, height: 1100, bar: 48 },
} as const
export type Layout = keyof typeof WINDOWS

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
	layout?: Layout
}

/** A scene from the live site in a browser window, with the real pointer, a moving camera and a caption. */
export function Shot({ clip, log, from, camera, cues, layout = 'landscape' }: ShotProps) {
	const WIN = WINDOWS[layout]
	// The page fills the window's height; a landscape window shows all of it, a portrait one a slice.
	const BASE = WIN.height / CLIP.h
	const view = { w: WIN.width / BASE, h: WIN.height / BASE }
	const frame = useCurrentFrame()
	const { fps } = useVideoConfig()
	const t = frame / fps + from
	const ease = { easing: Easing.bezier(0.65, 0, 0.35, 1), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
	const times = camera.map((key) => key.t)
	const at = (field: keyof CameraKey) => (camera.length > 1 ? interpolate(t, times, camera.map((key) => key[field]), ease) : camera[0][field])
	const s = at('scale')
	// Bring the focus toward the middle of the window, never past the page's edges.
	const tx = Math.min(0, Math.max(view.w - CLIP.w * s, view.w / 2 - at('x') * s))
	const ty = Math.min(0, Math.max(view.h - CLIP.h * s, view.h / 2 - at('y') * s))
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
						<div style={{ minWidth: layout === 'portrait' ? 0 : 560, maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', padding: '7px 18px', borderRadius: 9, background: '#fff', fontFamily: BODY, fontWeight: 500, fontSize: 17, color: '#3d3a35', textAlign: 'center' }}>
							<span style={{ color: '#0a7046' }}>🔒 </span>
							{url.replace(/^https?:\/\//, '').replace(/\?view=budget$/, '')}
						</div>
					</div>
					<span style={{ width: 66 }} />
				</div>
				<div style={{ position: 'relative', width: WIN.width, height: WIN.height, overflow: 'hidden' }}>
					<div style={{ position: 'absolute', width: CLIP.w, height: CLIP.h, transform: `scale(${BASE})`, transformOrigin: '0 0' }}>
						<div style={{ position: 'absolute', width: CLIP.w, height: CLIP.h, transform: `translate(${tx}px, ${ty}px) scale(${s})`, transformOrigin: '0 0' }}>
							<Video src={staticFile(`clips/${clip}.mp4`)} trimBefore={Math.round(from * fps)} muted style={{ width: CLIP.w, height: CLIP.h }} />
							<Cursor samples={log.pointer} clicks={clicks} offset={from} size={46 / Math.sqrt(s)} />
						</div>
					</div>
				</div>
			</div>
			{cues.map((cue) => (layout === 'portrait' ? <TopCaption key={cue.headline} cue={cue} t={t} /> : <LowerCaption key={cue.headline} cue={cue} t={t} />))}
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

/** Portrait: the caption owns the band above the window, big enough to read on a phone at a glance. */
function TopCaption({ cue, t }: { cue: Cue; t: number }) {
	const { fps } = useVideoConfig()
	const local = (t - cue.from) * fps
	const enter = spring({ frame: local, fps, config: { damping: 200 }, durationInFrames: 16 })
	const detail = spring({ frame: local - 7, fps, config: { damping: 200 }, durationInFrames: 16 })
	const leave = interpolate(t, [cue.to - 0.3, cue.to], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
	if (t < cue.from - 0.1 || t > cue.to + 0.05) return null
	return (
		<div style={{ position: 'absolute', left: 64, right: 64, top: 0, height: 480, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18, opacity: leave }}>
			<div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: cue.headline.length > 28 ? 74 : 88, lineHeight: 1.02, letterSpacing: '-0.025em', color: COLORS.ink, opacity: enter, transform: `translateY(${(1 - enter) * 28}px)` }}>{cue.headline}</div>
			{cue.detail ? <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 44, lineHeight: 1.22, color: COLORS.mint, opacity: detail, transform: `translateY(${(1 - detail) * 18}px)` }}>{cue.detail}</div> : null}
		</div>
	)
}
