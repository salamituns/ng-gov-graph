import type React from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import { AbsoluteFill, Img, continueRender, delayRender, staticFile, useCurrentFrame } from 'remotion'
import { Soundtrack } from '../film/Soundtrack'
import { DISPLAY, fontsReady } from './fonts'
import { C, PRESIDENT_AT, Product, WHEEL_BOX } from './Product'
import { EASE, FPS, FRAMES, PLAN, RISE, SAYS, hits, panelAt, prog, spike } from './plan'

type Rect = { x: number; y: number; w: number; h: number }
type Rects = Record<string, Rect>

/** Layout position inside the stage, ignoring transforms (the camera scales an ancestor; offsets don't see it). */
function offsetRect(el: HTMLElement, root: HTMLElement): Rect {
	let x = 0
	let y = 0
	let node: HTMLElement | null = el
	while (node && node !== root) {
		x += node.offsetLeft
		y += node.offsetTop
		node = node.offsetParent as HTMLElement | null
	}
	return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

/** Measures every data-obj once the fonts are in, so the camera frames real layout rather than guesses. */
function useRects(root: React.RefObject<HTMLDivElement | null>, title: React.RefObject<HTMLSpanElement | null>) {
	const [rects, setRects] = useState<Rects | null>(null)
	const [handle] = useState(() => delayRender('measure the stage'))
	useLayoutEffect(() => {
		let live = true
		fontsReady.then(() => {
			if (!live || !root.current) return
			const found: Rects = { WHEEL: WHEEL_BOX, PRESIDENT: { x: PRESIDENT_AT.x - 24, y: PRESIDENT_AT.y - 24, w: 48, h: 48 } }
			root.current.querySelectorAll<HTMLElement>('[data-obj]').forEach((el) => {
				const key = el.dataset.obj as string
				if (!found[key]) found[key] = offsetRect(el, root.current as HTMLElement)
			})
			const o = title.current?.getBoundingClientRect()
			if (o) found.O = { x: o.left, y: o.top, w: o.width, h: o.height }
			setRects(found)
			continueRender(handle)
		})
		return () => {
			live = false
		}
	}, [handle, root, title])
	return rects
}

type View = { cx: number; cy: number; s: number }
const FULL: View = { cx: 960, cy: 540, s: 1 }

function frameOn(rect: Rect, height: number): View {
	// Fill `height` of the frame with the target, but never wider than the frame allows.
	const s = Math.min((1080 * height) / rect.h, (1920 * 0.94) / rect.w)
	return { cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2, s }
}

/** The camera at `t`: each move travels from wherever the previous one had got to, on the house in-out curve. */
function cameraAt(t: number, rects: Rects): View {
	let view = FULL
	for (const move of PLAN.camera) {
		if (t < move.at) break
		const target = move.target === 'full' ? FULL : frameOn(rects[move.target], move.height ?? 1)
		const k = move.dur === 0 ? 1 : prog(t, move.at, move.dur, EASE.inout)
		view = { cx: view.cx + (target.cx - view.cx) * k, cy: view.cy + (target.cy - view.cy) * k, s: view.s + (target.s - view.s) * k }
	}
	return view
}

/** One word that rises into place from under its own baseline, and later rises out. */
function Word({ text, enter, exit, gap = '0.26em' }: { text: string; enter: number; exit: number; gap?: string }) {
	const y = (1 - enter) * 110 - exit * 110
	return (
		<span style={{ display: 'inline-block', overflow: 'hidden', padding: '0 0 0.14em', margin: `0 ${gap} -0.14em 0`, verticalAlign: 'top' }}>
			<span style={{ display: 'inline-block', transform: `translateY(${y}%)` }}>{text}</span>
		</span>
	)
}

/** The pointer, in stage space but drawn at a constant size on screen. */
function Pointer({ t, rects, scale }: { t: number; rects: Rects; scale: number }) {
	const index = PLAN.clicks.findIndex((c, i) => t >= c.at && t < (PLAN.clicks[i + 1]?.at ?? Infinity) && t < c.exitAt + 0.35)
	if (index < 0) return null
	const click = PLAN.clicks[index]
	const target = rects[click.target]
	const to = { x: target.x + target.w * 0.45, y: target.y + target.h * 0.55 }
	const prev = PLAN.clicks[index - 1]
	const chained = prev && prev.exitAt >= click.at
	const from = chained ? (() => { const r = rects[prev.target]; return { x: r.x + r.w * 0.45, y: r.y + r.h * 0.55 } })() : { x: to.x + 260 / scale, y: to.y + 220 / scale }
	const travel = prog(t, click.at, click.dur * 0.85, EASE.inout)
	const hit = click.at + click.dur
	const leave = prog(t, click.exitAt, 0.35, EASE.in)
	const x = from.x + (to.x - from.x) * travel + (leave * 120) / scale
	const y = from.y + (to.y - from.y) * travel + (leave * 90) / scale
	const appear = chained ? 1 : prog(t, click.at, 0.25, EASE.out)
	const press = t >= hit - 0.06 && t < hit + 0.2 ? 0.82 + 0.18 * prog(t, hit, 0.2, EASE.out) : 1
	const since = t - hit
	const size = 46 / scale
	return (
		<>
			{since >= 0 && since < 0.6 ? (
				<div style={{ position: 'absolute', left: to.x, top: to.y, width: 120 / scale, height: 120 / scale, marginLeft: -60 / scale, marginTop: -60 / scale, borderRadius: 999, border: `${6 / scale}px solid ${C.green}`, opacity: 0.85 * (1 - since / 0.6), transform: `scale(${0.3 + 1.3 * prog(t, hit, 0.6, EASE.out)})` }} />
			) : null}
			<svg viewBox="0 0 24 24" width={size} height={size} style={{ position: 'absolute', left: x - size * 0.16, top: y - size * 0.08, opacity: appear * (1 - leave), transform: `scale(${press})`, transformOrigin: '16% 8%', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.35))' }}>
				<path d="M4 2 L4 19 L8.6 14.9 L11.7 21.6 L14.6 20.3 L11.5 13.8 L17.6 13.8 Z" fill="#111" stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
			</svg>
		</>
	)
}

/** Ring, marker and spotlight: the highlights that point at one thing at a time. */
function Highlights({ t, rects, scale }: { t: number; rects: Rects; scale: number }) {
	const p = PLAN
	const panel = panelAt(t)
	const out: React.ReactNode[] = []

	// A green ring around the office holder.
	if (t >= p.ringAt && t < p.ringAt + 2.2 && panel === 'president') {
		const r = rects.HOLDER
		const k = prog(t, p.ringAt, 0.45, EASE.out)
		const fade = 1 - prog(t, p.ringAt + 1.9, 0.3, EASE.in)
		const pad = 8
		out.push(<div key="ring" style={{ position: 'absolute', left: r.x - pad, top: r.y - pad, width: r.w + pad * 2, height: r.h + pad * 2, borderRadius: 14, border: `${4 / Math.max(1, scale * 0.6)}px solid ${C.green}`, opacity: k * fade, transform: `scale(${1.06 - 0.06 * k})` }} />)
	}

	// Spotlight on the Education chip: the rest of the card dims around it.
	if (t >= p.spotAt && t < p.topicAt) {
		const r = rects.EDU_CHIP
		const dim = 0.45 * prog(t, p.spotAt, 0.5, EASE.out)
		out.push(<div key="spot" style={{ position: 'absolute', left: r.x - 6, top: r.y - 6, width: r.w + 12, height: r.h + 12, borderRadius: 99, boxShadow: `0 0 0 4000px rgba(27,26,23,${dim})` }} />)
	}

	// Highlighter strokes, multiplied over the type so the ink stays black.
	const marker = (key: string, at: number, until: boolean) => {
		if (t < at || !until) return
		const r = rects[key]
		out.push(<div key={key} style={{ position: 'absolute', left: r.x - 6, top: r.y + r.h * 0.12, width: r.w + 12, height: r.h * 0.84, background: '#9bdcb7', mixBlendMode: 'multiply', borderRadius: 4, transformOrigin: '0 50%', transform: `scaleX(${prog(t, at, 0.6, EASE.out)})` }} />)
	}
	marker('EDU_MINISTRY_LINK', p.linkMarkAt, panel === 'topic')
	marker('PER_PERSON', p.perPersonAt, panel === 'ministry')
	return <>{out}</>
}

function Title({ t, oRef }: { t: number; oRef?: React.RefObject<HTMLSpanElement | null> }) {
	const p = PLAN
	const enter = (i: number) => prog(t, p.titleAt + i * 0.07, 0.6, EASE.out)
	const words = ['Who', 'actually', 'runs', 'Nigeria?']
	return (
		<h1 style={{ margin: 0, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 700, fontSize: 176, lineHeight: 1.02, letterSpacing: '-0.035em', color: C.ink }}>
			{[words.slice(0, 2), words.slice(2)].map((line, li) => (
				<div key={li}>
					{line.map((word, wi) => {
						const i = li * 2 + wi
						if (word !== 'Who') return <Word key={word} text={word} enter={enter(i)} exit={0} gap={wi === line.length - 1 ? '0' : '0.24em'} />
						// "Who" is split so the dive can find the middle of its "o".
						return (
							<span key={word} style={{ display: 'inline-block', overflow: 'hidden', padding: '0 0 0.14em', margin: '0 0.24em -0.14em 0', verticalAlign: 'top' }}>
								<span style={{ display: 'inline-block', transform: `translateY(${(1 - enter(i)) * 110}%)` }}>
									Wh<span ref={oRef}>o</span>
								</span>
							</span>
						)
					})}
				</div>
			))}
		</h1>
	)
}

function EndCard({ t }: { t: number }) {
	const p = PLAN
	const drift = prog(t, p.aAt, 2.4, EASE.soft) * 60
	const fill: React.CSSProperties = { backgroundImage: 'linear-gradient(90deg,#066b3f,#1ea968,#008751,#066b3f)', backgroundSize: '300% 100%', backgroundPosition: `${drift}% 0`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
	const pill = prog(t, p.pillAt, 0.6, EASE.out) * 140 - 40
	const iris = prog(t, p.pillAt + 0.1, 0.6, EASE.out) * 75
	const shine = prog(t, p.pillAt + 0.8, 0.9, EASE.inout)
	const glow = spike(t, p.pillAt + 0.4, 0.9) * 0.7
	return (
		<AbsoluteFill style={{ background: C.canvas, display: 'grid', placeItems: 'center' }}>
			<div style={{ textAlign: 'center', fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '-0.03em' }}>
				<h2 style={{ margin: 0, fontSize: 140, lineHeight: 1.04, color: C.ink }}>
					{'Who runs your state?'.split(' ').map((w, i, all) => <Word key={i} text={w} enter={prog(t, p.qAt + i * 0.05, 0.6, EASE.out)} exit={0} gap={i === all.length - 1 ? '0' : '0.24em'} />)}
				</h2>
				<h2 style={{ margin: '6px 0 0', fontSize: 140, lineHeight: 1.1, filter: glow ? `drop-shadow(0 0 ${30 * glow}px rgba(0,135,81,${0.5 * glow}))` : undefined }}>
					{['Find', 'out.'].map((w, i) => (
						<span key={w} style={{ display: 'inline-block', overflow: 'hidden', padding: '0 0 0.14em', margin: `0 ${i ? 0 : '0.24em'} -0.14em 0`, verticalAlign: 'top' }}>
							<span style={{ display: 'inline-block', transform: `translateY(${(1 - prog(t, p.aAt + i * 0.12, 0.55, EASE.out)) * 110}%)`, ...fill }}>{w}</span>
						</span>
					))}
				</h2>
				<div style={{ margin: '54px auto 0', display: 'inline-flex', alignItems: 'center', gap: 22, padding: '20px 40px', borderRadius: 99, background: C.white, boxShadow: '0 6px 20px #0003', WebkitMaskImage: `linear-gradient(to top, #000 ${pill}%, transparent ${pill + 35}%)`, maskImage: `linear-gradient(to top, #000 ${pill}%, transparent ${pill + 35}%)` }}>
					<span style={{ position: 'relative', width: 58, height: 58, overflow: 'hidden', borderRadius: 12, clipPath: `circle(${iris}% at 50% 50%)` }}>
						<Img src={staticFile('icon.svg')} style={{ width: 58, height: 58 }} />
						{shine > 0 && shine < 1 ? <span style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', background: `linear-gradient(115deg, transparent ${shine * 200 - 70}%, rgba(255,255,255,.85) ${shine * 200 - 50}%, transparent ${shine * 200 - 30}%)` }} /> : null}
					</span>
					<span style={{ fontSize: 62, letterSpacing: '-0.02em', color: C.ink }}>whoruns9ja.com</span>
				</div>
			</div>
		</AbsoluteFill>
	)
}

/** The Impractical storyboard rendered in Remotion: the live product's wheel as the set, one idea per beat. */
export function MotionFilm({ music = true }: { music?: boolean }) {
	const frame = useCurrentFrame()
	const t = frame / FPS
	const p = PLAN
	const stage = useRef<HTMLDivElement>(null)
	const o = useRef<HTMLSpanElement>(null)
	const rects = useRects(stage, o)

	const say = p.says.find((s) => t >= s.at && t < s.end)
	const beforeCut = t < p.cut
	const atEnd = t >= p.endAt

	// Camera, plus the dive's landing (the product arrives large and soft, and settles) and the whip's blur.
	const view = rects ? cameraAt(t, rects) : FULL
	const land = prog(t, p.cut, p.dive.out, EASE.out)
	const zoom = 1 + 0.6 * (1 - land)
	const blur = 14 * (1 - land) * (t >= p.cut ? 1 : 0) + 12 * spike(t, p.whipAt, 0.45)
	const s = view.s * zoom

	// The dive: the title scales into the counter of its "o" until the canvas inside it fills the frame.
	const dive = prog(t, p.dive.at, p.dive.in, EASE.in)
	const oRect = rects?.O
	// Scale about the counter of the "o" while carrying it to the centre of the frame.
	const oc = oRect ? { x: oRect.x + oRect.w / 2, y: oRect.y + oRect.h * 0.6 } : { x: 960, y: 540 }
	const carry = prog(t, p.dive.at, p.dive.in, EASE.inout)
	const diveTransform = `translate(${(960 - oc.x) * carry}px, ${(540 - oc.y) * carry}px) scale(${1 + 47 * dive})`

	return (
		<AbsoluteFill style={{ background: C.canvas, overflow: 'hidden' }}>
			<Soundtrack hits={hits()} fps={FPS} total={FRAMES} music={music} musicDrop={p.hit1} />

			{/* The world: the site's dotted canvas and the product, moved together by the camera. */}
			<div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(960px, 540px) scale(${s}) translate(${-view.cx}px, ${-view.cy}px)`, filter: blur > 0.2 ? `blur(${blur}px)` : undefined, visibility: beforeCut || atEnd ? 'hidden' : 'visible' }}>
				<div style={{ position: 'absolute', inset: -1400, backgroundColor: C.canvas, backgroundImage: 'radial-gradient(circle, #cfd3ca 1.6px, transparent 1.9px)', backgroundSize: '28px 28px' }} />
				<div ref={stage} style={{ position: 'absolute', inset: 0 }}>
					<Product t={t} />
				</div>
				{rects ? <Highlights t={t} rects={rects} scale={s} /> : null}
				{rects ? <Pointer t={t} rects={rects} scale={s} /> : null}
			</div>

			{/* One held vignette over the world. */}
			<AbsoluteFill style={{ pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(27,26,23,0.14) 100%)' }} />

			{/* Say it, then show it: one statement at a time over the product. */}
			{say ? (
				<AbsoluteFill style={{ background: 'rgba(233,235,230,0.95)', display: 'grid', placeItems: 'center' }}>
					<h2 style={{ width: 1500, margin: 0, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 700, fontSize: 116, lineHeight: 1.06, letterSpacing: '-0.025em', color: C.ink }}>
						{SAYS[say.n].split(' ').map((w, i, all) => (
							<Word key={i} text={w} gap={i === all.length - 1 ? '0' : '0.24em'} enter={prog(t, say.at + i * RISE.stagger, RISE.dur, EASE.out)} exit={prog(t, say.outAt + i * RISE.exitStagger, RISE.exit, EASE.in)} />
						))}
					</h2>
				</AbsoluteFill>
			) : null}

			{/* Cold open. */}
			{/* A still, invisible copy of the title: where its "o" sits, measured the same on every frame. */}
			<AbsoluteFill style={{ visibility: 'hidden', display: 'grid', placeItems: 'center' }}>
				<Title t={99} oRef={o} />
			</AbsoluteFill>
			{beforeCut ? (
				<AbsoluteFill style={{ background: C.canvas, display: 'grid', placeItems: 'center', transformOrigin: `${oc.x}px ${oc.y}px`, transform: diveTransform, filter: dive > 0.35 ? `blur(${Math.min(8, (dive - 0.35) * 20)}px)` : undefined }}>
					<Title t={t} />
				</AbsoluteFill>
			) : null}

			{atEnd ? <EndCard t={t} /> : null}
		</AbsoluteFill>
	)
}

export { FRAMES as MOTION_FRAMES }
