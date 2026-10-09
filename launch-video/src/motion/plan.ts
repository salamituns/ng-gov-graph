import { Easing, interpolate } from 'remotion'

/**
 * The film's timeline, in seconds: the beat sheet from impractical/draft/direction.ts, computed once. Every
 * layer reads from this, so moving a beat moves its picture, its camera and its sound together.
 */

export const FPS = 30

// The house curves: out for entrances, in-out for travel and camera, in for exits and dives only.
export const EASE = {
	out: Easing.bezier(0.16, 1, 0.3, 1),
	soft: Easing.bezier(0.33, 1, 0.68, 1),
	inout: Easing.bezier(0.65, 0, 0.35, 1),
	in: Easing.bezier(0.7, 0, 0.84, 0),
}

/** 0→1 progress of a tween that starts at `at` and lasts `dur`, eased. */
export function prog(t: number, at: number, dur: number, ease: (n: number) => number = EASE.out) {
	return ease(interpolate(t, [at, at + Math.max(dur, 1e-3)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
}

/** A spike: 0 → 1 → 0 across `dur` (a blur or a bloom that lands and lets go). */
export function spike(t: number, at: number, dur: number) {
	if (t < at || t > at + dur) return 0
	return Math.sin((Math.PI * (t - at)) / dur)
}

export const SAYS = [
	'Every office in the federal government. One map.',
	'Click any office.',
	'See who holds it, and who put them there.',
	"See which office is responsible for this week's news.",
	'Then follow the money.',
	'About ₦10,600 for every Nigerian.',
	'Meet your governor, senators and reps. By name.',
	'Elections: 16 January 2027.',
]

/** Word-by-word rise timing for a statement plate. */
export const RISE = { dur: 0.55, stagger: 0.05, exit: 0.35, exitStagger: 0.02 }
const words = (line: string) => line.split(' ').length
const enterDur = (line: string) => RISE.dur + (words(line) - 1) * RISE.stagger
const exitDur = (line: string) => RISE.exit + (words(line) - 1) * RISE.exitStagger

export type Say = { n: number; at: number; outAt: number; end: number }
export type CameraMove = { at: number; dur: number; target: 'full' | string; height?: number }
export type Click = { at: number; dur: number; target: string; exitAt: number }

function build() {
	const says: Say[] = []
	const camera: CameraMove[] = []
	const clicks: Click[] = []
	const say = (n: number, at: number, read: number) => {
		const outAt = at + enterDur(SAYS[n]) + read
		const end = outAt + exitDur(SAYS[n])
		says.push({ n, at, outAt, end })
		return end
	}
	const focus = (target: string, height: number, at: number, dur = 0.9) => camera.push({ at, dur, target, height })
	const full = (at: number) => camera.push({ at, dur: 0, target: 'full' })

	// 1. Cold open: the question, then a dive through the "o" of "Who" into the map.
	const titleAt = 0.25
	const titleDur = 0.6 + 0.2
	const diveAt = titleAt + titleDur + 0.85
	const dive = { at: diveAt, in: 0.55, out: 1.0 }
	const cut = diveAt + dive.in
	let t = cut + dive.out

	// 2. The product, whole.
	const sweepAt = t + 0.1
	t = say(0, t + 1.5, 1.25)

	// 3. Click any office: the President's lines fan out across the government.
	focus('WHEEL', 0.98, t)
	t = say(1, t + 1.0, 0.7)
	const press = 0.9
	const hit1 = t + press
	clicks.push({ at: t, dur: press, target: 'PRESIDENT', exitAt: hit1 + 0.5 })
	t = hit1 + 2.2

	// 4. Who holds it, and who put them there.
	t = say(2, t, 1.3)
	focus('PRES_CARD', 0.86, t)
	const ringAt = t + 1.0
	t += 3.0

	// 5. This week's news, and the office responsible. Under the plate: back home, camera reset.
	const backAt = say(3, t, 1.6)
	full(backAt - 0.05)
	const whipAt = backAt + 0.2
	focus('NEWS_CARD', 0.6, whipAt, 0.45)
	const spotAt = whipAt + 0.6
	const chipPress = 0.9
	const topicAt = whipAt + 0.7 + chipPress
	focus('TOPIC_CARD', 0.78, topicAt + 0.15)
	const linkMarkAt = topicAt + 1.1
	const linkPress = 0.8
	clicks.push({ at: whipAt + 0.7, dur: chipPress, target: 'EDU_CHIP', exitAt: topicAt + 2.0 })
	clicks.push({ at: topicAt + 2.0, dur: linkPress, target: 'EDU_MINISTRY_LINK', exitAt: topicAt + 2.0 + linkPress + 0.05 })
	t = topicAt + 2.0 + linkPress + 0.2

	// 6. Follow the money.
	const moneyAt = say(4, t, 0.8)
	focus('BUDGET', 0.66, moneyAt)
	const countAt = moneyAt + 0.9
	const countDur = 1.2
	const settleAt = countAt + countDur + 0.1
	const perPersonAt = countAt + countDur + 0.7
	t = countAt + countDur + 2.2

	// 7. Make it personal.
	t = say(5, t, 1.2)

	// 8. Your own representatives, by name.
	const lagosAt = say(6, t, 1.4)
	full(lagosAt - 0.05)
	const dropAt = lagosAt + 0.4
	focus('LAGOS_CARD', 0.9, lagosAt + 1.6)
	t = lagosAt + 3.6

	// 9. The election, then hand the question to the viewer.
	const endAt = say(7, t, 1.3)
	full(endAt)
	const qAt = endAt + 0.1
	const aAt = qAt + 0.6
	const pillAt = aAt + 0.55 + 0.12 + 0.15
	const total = pillAt + 0.9 + 2.4

	return {
		says, camera, clicks, total,
		titleAt, dive, cut, sweepAt, hit1, ringAt, backAt, whipAt, spotAt, topicAt, linkMarkAt,
		moneyAt, countAt, countDur, settleAt, perPersonAt, lagosAt, dropAt, endAt, qAt, aAt, pillAt,
	}
}

export const PLAN = build()
export const FRAMES = Math.round(PLAN.total * FPS)

export type PanelName = 'home' | 'president' | 'topic' | 'ministry' | 'lagos'

/** Which side panel is showing; every swap happens behind a statement plate or on a click. */
export function panelAt(t: number): PanelName {
	const p = PLAN
	if (t >= p.lagosAt - 0.05) return 'lagos'
	if (t >= p.moneyAt - 0.05) return 'ministry'
	if (t >= p.topicAt) return 'topic'
	if (t >= p.backAt - 0.05) return 'home'
	if (t >= p.hit1) return 'president'
	return 'home'
}

/** The sound, from the same beats: a rise under the title, whooshes on the dive and the whip, a click per click. */
export function hits() {
	const p = PLAN
	type Hit = { at: number; sound: 'click' | 'whoosh' | 'rise' | 'resolve'; volume: number }
	const list: Hit[] = [
		{ at: 0.05, sound: 'rise', volume: 0.5 },
		{ at: p.dive.at, sound: 'whoosh', volume: 0.3 },
		{ at: p.whipAt - 0.05, sound: 'whoosh', volume: 0.22 },
		{ at: p.endAt - 0.15, sound: 'whoosh', volume: 0.26 },
		{ at: p.aAt + 0.2, sound: 'resolve', volume: 0.5 },
	]
	for (const click of p.clicks) list.push({ at: click.at + click.dur, sound: 'click', volume: 0.42 })
	for (const say of p.says) list.push({ at: Math.max(0, say.at - 0.05), sound: 'whoosh', volume: 0.1 })
	return list.sort((a, b) => a.at - b.at)
}
