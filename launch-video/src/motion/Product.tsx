import type React from 'react'
import { Img, staticFile } from 'remotion'
import { BODY, MONO } from './fonts'
import { EASE, PLAN, panelAt, prog, spike, type PanelName } from './plan'

// brand.json is law: Map Canvas ground, Map Ink type, Naija Green only for live / money / in-office signals.
export const C = { canvas: '#e9ebe6', ink: '#1b1a17', ash: '#737373', faint: '#9d988f', green: '#008751', greenSoft: '#e3f6ec', white: '#ffffff', mist: '#f5f5f5', line: '#e5e5e5', pay: '#7a5aa6', run: '#b8901a' }

// The three wheels are whoruns9ja.com's own rendered SVG, captured with computed paint (impractical/grab-svg.mjs).
const WHEEL = staticFile('motion/wheel.min.svg')
const WHEEL_PRESIDENT = staticFile('motion/wheel-president.min.svg')
const WHEEL_LAGOS = staticFile('motion/wheel-lagos.min.svg')
const MARK = staticFile('icon.svg')

/** The wheel sits at a fixed place on the stage; the President's office was measured on the capture. */
export const WHEEL_BOX = { x: 860, y: 40, w: 1000, h: 1000 }
export const PRESIDENT_AT = { x: WHEEL_BOX.x + 0.487 * WHEEL_BOX.w, y: WHEEL_BOX.y + 0.688 * WHEEL_BOX.h }

const card: React.CSSProperties = { background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: '26px 30px', boxShadow: '0 1px 2px #0000000d' }
const cardTitle: React.CSSProperties = { fontSize: 24, fontWeight: 700, margin: 0 }
const label: React.CSSProperties = { fontFamily: MONO, fontSize: 15, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.ash }
const stack: React.CSSProperties = { position: 'absolute', inset: 0, display: 'grid', gap: 22, alignContent: 'start' }
const link: React.CSSProperties = { textDecoration: 'underline', textUnderlineOffset: 4 }

/** A soft green glow as a beat lands: light, not opacity. */
const bloom = (amount: number) => (amount > 0 ? `drop-shadow(0 0 ${28 * amount}px rgba(0,135,81,${0.55 * amount})) brightness(${1 + 0.12 * amount})` : undefined)

function Person({ initials, name, meta, obj, drop }: { initials: string; name: string; meta: string; obj?: string; drop?: number }) {
	const style: React.CSSProperties = drop === undefined ? {} : { opacity: Math.min(1, drop * 1.6), transform: `translateY(${(1 - drop) * -26}px)` }
	return (
		<div data-obj={obj} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '14px 16px', border: `1px solid ${C.line}`, borderRadius: 10, background: C.white, ...style }}>
			<span style={{ width: 64, height: 64, flex: '0 0 64px', borderRadius: '50%', background: C.greenSoft, color: C.green, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 22 }}>{initials}</span>
			<div>
				<div style={{ fontSize: 24, fontWeight: 700 }}>{name}</div>
				<div style={{ fontSize: 19, color: C.ash, marginTop: 2 }}>{meta}</div>
			</div>
		</div>
	)
}

const CHIPS: Array<[string, number]> = [['2027 elections & parties', 89], ['Insecurity', 32], ['Fuel prices', 28], ['Courts & rulings', 26], ['Education', 21], ['Wages & strikes', 18]]

/** The site's side panel and live wheel, in whatever state the timeline says at `t`. */
export function Product({ t }: { t: number }) {
	const p = PLAN
	const panel = panelAt(t)
	const show = (name: PanelName): React.CSSProperties => (panel === name ? {} : { visibility: 'hidden' })

	// The wheel turns the chosen office to the bottom, as the site does; the selected state spreads out from it.
	const turn = prog(t, p.hit1, 0.9, EASE.inout)
	const defaultWheel = t < p.hit1 + 1.2 || (t >= p.backAt - 0.05 && t < p.lagosAt - 0.05)
	const defaultTurn = t >= p.backAt - 0.05 ? 0 : -3.96 * turn
	const presidentWheel = t >= p.hit1 && t < p.backAt - 0.05
	const reveal = prog(t, p.hit1, 1.2, EASE.out) * 150
	const lagosWheel = t >= p.lagosAt - 0.05

	// Follow the money: the figure counts up with the bar, then settles to the site's own short form.
	const counted = Math.round(2560 * prog(t, p.countAt, p.countDur, EASE.soft))
	const settled = t >= p.settleAt
	const flash = spike(t, p.settleAt, 0.5)
	const bar = t < p.moneyAt ? 0 : prog(t, p.countAt, p.countDur, EASE.soft)

	// The topic card wipes down from its top edge with a soft feather.
	const feather = prog(t, p.topicAt, 0.6, EASE.out) * 130 - 30
	const sweep = prog(t, p.sweepAt, 1.3, EASE.inout)
	const drop = (i: number) => prog(t, p.dropAt + i * 0.09, 0.5, EASE.out)

	const wheelImg: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', transformOrigin: '50% 50%' }

	return (
		<div style={{ position: 'absolute', inset: 0, fontFamily: BODY, fontWeight: 500, color: C.ink }}>
			<div data-obj="PANEL" style={{ position: 'absolute', left: 60, top: 54, width: 720, bottom: 54 }}>
				{/* Brand bar, as on the site: the Nigeria mark, the name, the country. */}
				<div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: '18px 26px', borderBottom: `4px dashed ${C.green}` }}>
					<Img src={MARK} style={{ width: 34, height: 34 }} />
					<span style={{ fontSize: 24, fontWeight: 700 }}>Who Runs Naija</span>
					<span style={{ color: C.faint, fontSize: 24 }}>/</span>
					<span style={{ display: 'inline-flex', width: 30, height: 20, borderRadius: 3, overflow: 'hidden', border: `1px solid ${C.line}` }}>
						<i style={{ flex: 1, background: C.green }} />
						<i style={{ flex: 1, background: C.white }} />
						<i style={{ flex: 1, background: C.green }} />
					</span>
					<span style={{ fontSize: 22 }}>Nigeria</span>
				</div>

				<div style={{ position: 'relative', marginTop: 22, height: 860 }}>
					{/* Home: what the site opens on. */}
					<div style={{ ...stack, ...show('home') }}>
						<div data-obj="NEWS_CARD" style={card}>
							<h3 style={cardTitle}>Most covered this week</h3>
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 18 }}>
								{CHIPS.map(([name, count]) => (
									<span key={name} data-obj={name === 'Education' ? 'EDU_CHIP' : undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: C.mist, border: `1px solid ${C.line}`, borderRadius: 99, padding: '10px 18px', fontSize: 21 }}>
										{name}
										<span style={{ fontFamily: MONO, fontSize: 16, color: C.ash }}>{count}</span>
									</span>
								))}
							</div>
						</div>
						<div style={card}>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<h3 style={cardTitle}>2027 General Election</h3>
								<span style={{ fontSize: 18, color: C.ash, textDecoration: 'underline' }}>INEC</span>
							</div>
							<div style={{ ...label, marginTop: 14 }}>Presidential &amp; National Assembly</div>
							<div style={{ fontFamily: MONO, fontSize: 40, fontWeight: 600, color: C.green, marginTop: 10 }}>Sat, 16 Jan 2027</div>
							<div style={{ fontSize: 20, marginTop: 8 }}>Polls open 8:30 a.m. WAT · President, 109 senators and 360 representatives</div>
						</div>
						<div style={card}>
							<h3 style={cardTitle}>Who represents me?</h3>
							<div style={{ fontSize: 19, color: C.ash, marginTop: 8 }}>Your governor, senators, members of the House of Representatives and state assembly.</div>
							<div style={{ marginTop: 16, border: `1px solid ${C.line}`, borderRadius: 8, padding: '14px 16px', fontSize: 20, background: C.mist }}>Choose your state…</div>
						</div>
					</div>

					{/* The President's page. */}
					<div style={{ ...stack, ...show('president') }}>
						<div data-obj="PRES_CARD" style={card}>
							<h3 style={{ ...cardTitle, fontSize: 32, lineHeight: 1.15 }}>President of the Federal Republic of Nigeria</h3>
							<p style={{ fontSize: 20, lineHeight: 1.45, margin: '14px 0 0' }}>Head of state, head of government, and commander-in-chief of the armed forces under section 130 of the 1999 Constitution.</p>
							<div style={{ ...label, marginTop: 22 }}>President</div>
							<div style={{ marginTop: 10 }}>
								<Person obj="HOLDER" initials="BT" name="Bola Ahmed Tinubu" meta="Since 2023 · APC" />
							</div>
						</div>
						<div style={card}>
							<h3 style={cardTitle}>What the Constitution says</h3>
							<div style={{ display: 'flex', gap: 16, marginTop: 14, alignItems: 'baseline' }}>
								<span style={{ fontFamily: MONO, fontSize: 16, background: C.greenSoft, color: C.green, borderRadius: 6, padding: '4px 10px', whiteSpace: 'nowrap' }}>s.132–134</span>
								<span style={{ fontSize: 19, lineHeight: 1.45 }}>Voters elect the President every four years. To win outright, a candidate needs the most votes and at least a quarter of the votes cast in two-thirds of the states and the FCT.</span>
							</div>
						</div>
					</div>

					{/* A topic in the news, and the offices responsible for it. */}
					<div style={{ ...stack, ...show('topic') }}>
						<div data-obj="TOPIC_CARD" style={{ ...card, WebkitMaskImage: `linear-gradient(to bottom, #000 ${feather}%, transparent ${feather + 30}%)`, maskImage: `linear-gradient(to bottom, #000 ${feather}%, transparent ${feather + 30}%)` }}>
							<div style={{ ...label, color: C.green }}>In the news</div>
							<h3 style={{ ...cardTitle, fontSize: 34, marginTop: 6 }}>Education</h3>
							<div style={{ fontSize: 21, marginTop: 10 }}>
								<span style={{ fontFamily: MONO }}>21</span> stories from <span style={{ fontFamily: MONO }}>6</span> outlets this week.
							</div>
							<div style={{ ...label, marginTop: 24 }}>Who is responsible</div>
							<div style={{ display: 'grid', gap: 10, marginTop: 12, fontSize: 22 }}>
								<span data-obj="EDU_MINISTRY_LINK" style={{ ...link, justifySelf: 'start' }}>Federal Ministry of Education</span>
								<span style={link}>Joint Admissions and Matriculation Board</span>
								<span style={link}>Tertiary Education Trust Fund</span>
								<span style={link}>Universal Basic Education Commission</span>
							</div>
						</div>
					</div>

					{/* The ministry, and what it spends. */}
					<div style={{ ...stack, ...show('ministry') }}>
						<div style={card}>
							<h3 style={{ ...cardTitle, fontSize: 32 }}>Federal Ministry of Education</h3>
							<p style={{ fontSize: 20, margin: '10px 0 0' }}>Federal education policy from basic to tertiary.</p>
							<div style={{ ...label, marginTop: 20 }}>Honourable Minister</div>
							<div style={{ marginTop: 10 }}>
								<Person initials="MT" name="Maruf Tunji Alausa" meta="Appointed 2024" />
							</div>
						</div>
						<div data-obj="BUDGET" style={card}>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<h3 style={cardTitle}>2026 budget</h3>
								<span style={{ fontSize: 18, color: C.green, fontWeight: 700 }}>All ministries</span>
							</div>
							<div data-obj="BUDGET_FIGURE" style={{ display: 'inline-block', fontFamily: MONO, fontSize: 64, fontWeight: 600, color: C.green, marginTop: 10, letterSpacing: '-0.02em', borderRadius: 8, padding: '0 8px', marginLeft: -8, background: `rgba(0,135,81,${0.14 * flash})`, filter: bloom(spike(t, p.settleAt, 0.8)) }}>
								{settled ? '₦2.56T' : `₦${counted.toLocaleString('en-US')}bn`}
							</div>
							<div style={{ fontSize: 20, marginTop: 6 }}>
								<span style={{ fontFamily: MONO }}>3.7%</span> of the <span style={{ fontFamily: MONO }}>₦68.32T</span> budget ·{' '}
								<span data-obj="PER_PERSON">
									about <span style={{ fontFamily: MONO }}>₦10,600</span> for every Nigerian
								</span>
							</div>
							<div style={{ display: 'flex', height: 14, borderRadius: 99, overflow: 'hidden', marginTop: 16, transformOrigin: '0% 50%', transform: `scaleX(${bar})` }}>
								<i style={{ flex: 174, background: C.pay }} />
								<i style={{ flex: 13, background: C.run }} />
								<i style={{ flex: 69, background: C.green }} />
							</div>
							<div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 17, color: C.ash }}>
								<span>Salaries <b style={{ fontFamily: MONO, color: C.ink, fontWeight: 500 }}>₦1.74T</b></span>
								<span>Running costs <b style={{ fontFamily: MONO, color: C.ink, fontWeight: 500 }}>₦132bn</b></span>
								<span>Projects <b style={{ fontFamily: MONO, color: C.ink, fontWeight: 500 }}>₦686bn</b></span>
							</div>
						</div>
					</div>

					{/* Who represents Lagos. */}
					<div style={{ ...stack, ...show('lagos') }}>
						<div data-obj="LAGOS_CARD" style={card}>
							<div style={label}>South West zone</div>
							<h3 style={{ ...cardTitle, fontSize: 34, marginTop: 6 }}>Lagos State</h3>
							<div style={{ ...label, marginTop: 18 }}>Governor</div>
							<div style={{ marginTop: 10 }}>
								<Person drop={drop(0)} initials="BS" name="Babajide Sanwo-Olu" meta="Since 2019 · APC" />
							</div>
							<div style={{ ...label, marginTop: 20 }}>Your senators</div>
							<div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
								<Person drop={drop(1)} initials="WE" name="Wasiu Sanni Eshilokun" meta="Lagos Central · APC" />
								<Person drop={drop(2)} initials="AM" name="Adetokunbo Abiru Mukhail" meta="Lagos East · APC" />
								<Person drop={drop(3)} initials="OA" name="Oluranti Adebule" meta="Lagos West · APC" />
							</div>
							<div style={{ fontSize: 19, color: C.ash, marginTop: 16, opacity: drop(4) }}>
								…and <span style={{ fontFamily: MONO, color: C.ink }}>24</span> members of the House of Representatives.
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* The wheel: three captured states stacked; the timeline swaps them. */}
			<div data-obj="WHEEL" style={{ position: 'absolute', left: WHEEL_BOX.x, top: WHEEL_BOX.y, width: WHEEL_BOX.w, height: WHEEL_BOX.h }}>
				<Img src={WHEEL} style={{ ...wheelImg, transform: `rotate(${defaultTurn}deg)`, visibility: defaultWheel ? 'visible' : 'hidden' }} />
				<Img
					src={WHEEL_PRESIDENT}
					style={{
						...wheelImg,
						transform: `rotate(${3.96 * (1 - turn)}deg)`,
						visibility: presidentWheel ? 'visible' : 'hidden',
						WebkitMaskImage: `radial-gradient(circle at 49% 69%, #000 ${reveal}%, transparent ${reveal + 14}%)`,
						maskImage: `radial-gradient(circle at 49% 69%, #000 ${reveal}%, transparent ${reveal + 14}%)`,
						filter: bloom(spike(t, p.hit1 + 0.35, 0.9) * 0.6),
					}}
				/>
				<Img src={WHEEL_LAGOS} style={{ ...wheelImg, visibility: lagosWheel ? 'visible' : 'hidden' }} />
				{/* A single pass of light across the wheel as it is first seen. */}
				{sweep > 0 && sweep < 1 ? (
					<div style={{ position: 'absolute', inset: 0, borderRadius: '50%', mixBlendMode: 'soft-light', background: `linear-gradient(115deg, transparent ${sweep * 160 - 50}%, rgba(255,255,255,0.9) ${sweep * 160 - 30}%, transparent ${sweep * 160 - 10}%)` }} />
				) : null}
			</div>
		</div>
	)
}
