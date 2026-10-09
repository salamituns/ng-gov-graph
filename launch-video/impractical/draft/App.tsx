import React from 'react'

// The set is the live product. The three wheels are whoruns9ja.com's own rendered SVG (captured with computed
// paint by launch-video/impractical/grab-svg.mjs), pinned to a commit so a re-render always gets the same file.
const SET = 'https://cdn.jsdelivr.net/gh/salamituns/ng-gov-graph@837e29f4d59a63e305418e72a63965b7680875d8'
const WHEEL = `${SET}/launch-video/impractical/wheel.min.svg`
const WHEEL_PRESIDENT = `${SET}/launch-video/impractical/wheel-president.min.svg`
const WHEEL_LAGOS = `${SET}/launch-video/impractical/wheel-lagos.min.svg`
const MARK = `${SET}/src/app/icon.svg`

// brand.json is law: Map Canvas ground, Map Ink type, Naija Green only for live / money / in-office signals.
const C = { canvas: '#e9ebe6', ink: '#1b1a17', ash: '#737373', faint: '#9d988f', green: '#008751', greenSoft: '#e3f6ec', white: '#ffffff', mist: '#f5f5f5', line: '#e5e5e5', pay: '#7a5aa6', run: '#b8901a' }
const DISPLAY = '"Bricolage Grotesque", "Bricolage Grotesque Fallback", sans-serif'
const BODY = '"Hanken Grotesk", "Hanken Grotesk Fallback", sans-serif'
const MONO = '"Geist Mono", "Geist Mono Fallback", monospace'

// The statements, in viewing order: say it, then the product shows it.
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

const hidden: React.CSSProperties = { visibility: 'hidden', opacity: 0 }
const card: React.CSSProperties = { background: C.white, border: `1px solid ${C.line}`, borderRadius: 10, padding: '26px 30px', boxShadow: '0 1px 2px #0000000d' }
const cardTitle: React.CSSProperties = { fontSize: 24, fontWeight: 700, margin: 0 }
const label: React.CSSProperties = { fontFamily: MONO, fontSize: 15, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.ash }

function Avatar({ initials }: { initials: string }) {
  return (
    <span style={{ width: 64, height: 64, flex: '0 0 64px', borderRadius: '50%', background: C.greenSoft, color: C.green, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 22 }}>{initials}</span>
  )
}

function Person({ initials, name, meta, obj, rep }: { initials: string; name: string; meta: string; obj?: string; rep?: boolean }) {
  return (
    <div data-obj={obj} data-rep={rep ? '' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '14px 16px', border: `1px solid ${C.line}`, borderRadius: 10, background: C.white }}>
      <Avatar initials={initials} />
      <div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{name}</div>
        <div style={{ fontSize: 19, color: C.ash, marginTop: 2 }}>{meta}</div>
      </div>
    </div>
  )
}

const CHIPS: Array<[string, number]> = [['2027 elections & parties', 89], ['Insecurity', 32], ['Fuel prices', 28], ['Courts & rulings', 26], ['Education', 21], ['Wages & strikes', 18]]

export function App() {
  return (
    <div style={{ position: 'relative', width: 1920, height: 1080, overflow: 'hidden', background: 'transparent', fontFamily: BODY, color: C.ink }}>
      {/* ───────────── The product: side panel + the live wheel ───────────── */}
      <div data-scene="product" data-obj="PRODUCT" style={{ position: 'absolute', inset: 0, ...hidden }}>
        <div data-obj="PANEL" style={{ position: 'absolute', left: 60, top: 54, width: 720, bottom: 54 }}>
          {/* Brand bar, as on the site: the Nigeria mark, the name, the country. */}
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: '18px 26px', borderBottom: `4px dashed ${C.green}` }}>
            <img src={MARK} alt="" style={{ width: 34, height: 34 }} />
            <span style={{ fontSize: 24, fontWeight: 700 }}>Who Runs Naija</span>
            <span style={{ color: C.faint, fontSize: 24 }}>/</span>
            <span style={{ display: 'inline-flex', width: 30, height: 20, borderRadius: 3, overflow: 'hidden', border: `1px solid ${C.line}` }}>
              <i style={{ flex: 1, background: C.green }} /><i style={{ flex: 1, background: C.white }} /><i style={{ flex: 1, background: C.green }} />
            </span>
            <span style={{ fontSize: 22 }}>Nigeria</span>
          </div>

          <div style={{ position: 'relative', marginTop: 22 }}>
            {/* Home: what the site opens on. */}
            <div data-panel="home" style={{ position: 'absolute', inset: 0, display: 'grid', gap: 22, alignContent: 'start' }}>
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
              <div data-obj="ELECTION" style={card}>
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
            <div data-panel="president" style={{ position: 'absolute', inset: 0, display: 'grid', gap: 22, alignContent: 'start', ...hidden }}>
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
            <div data-panel="topic" style={{ position: 'absolute', inset: 0, display: 'grid', gap: 22, alignContent: 'start', ...hidden }}>
              <div data-obj="TOPIC_CARD" style={card}>
                <div style={{ ...label, color: C.green }}>In the news</div>
                <h3 style={{ ...cardTitle, fontSize: 34, marginTop: 6 }}>Education</h3>
                <div style={{ fontSize: 21, marginTop: 10 }}><span style={{ fontFamily: MONO }}>21</span> stories from <span style={{ fontFamily: MONO }}>6</span> outlets this week.</div>
                <div style={{ ...label, marginTop: 24 }}>Who is responsible</div>
                <div style={{ display: 'grid', gap: 10, marginTop: 12, fontSize: 22 }}>
                  <span data-obj="EDU_MINISTRY_LINK" style={{ textDecoration: 'underline', textUnderlineOffset: 4, justifySelf: 'start' }}>Federal Ministry of Education</span>
                  <span style={{ textDecoration: 'underline', textUnderlineOffset: 4 }}>Joint Admissions and Matriculation Board</span>
                  <span style={{ textDecoration: 'underline', textUnderlineOffset: 4 }}>Tertiary Education Trust Fund</span>
                  <span style={{ textDecoration: 'underline', textUnderlineOffset: 4 }}>Universal Basic Education Commission</span>
                </div>
              </div>
            </div>

            {/* The ministry, and what it spends. */}
            <div data-panel="ministry" style={{ position: 'absolute', inset: 0, display: 'grid', gap: 22, alignContent: 'start', ...hidden }}>
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
                <div data-obj="BUDGET_FIGURE" style={{ fontFamily: MONO, fontSize: 64, fontWeight: 600, color: C.green, marginTop: 10, letterSpacing: '-0.02em' }}>
                  ₦<span data-count>0</span>bn
                </div>
                <div style={{ fontSize: 20, marginTop: 6 }}>
                  <span style={{ fontFamily: MONO }}>3.7%</span> of the <span style={{ fontFamily: MONO }}>₦68.32T</span> budget · <span data-obj="PER_PERSON">about <span style={{ fontFamily: MONO }}>₦10,600</span> for every Nigerian</span>
                </div>
                <div data-obj="SPEND_BAR" style={{ display: 'flex', height: 14, borderRadius: 99, overflow: 'hidden', marginTop: 16, transformOrigin: '0% 50%' }}>
                  <i style={{ flex: 174, background: C.pay }} /><i style={{ flex: 13, background: C.run }} /><i style={{ flex: 69, background: C.green }} />
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: 17, color: C.ash }}>
                  <span>Salaries <b style={{ fontFamily: MONO, color: C.ink, fontWeight: 500 }}>₦1.74T</b></span>
                  <span>Running costs <b style={{ fontFamily: MONO, color: C.ink, fontWeight: 500 }}>₦132bn</b></span>
                  <span>Projects <b style={{ fontFamily: MONO, color: C.ink, fontWeight: 500 }}>₦686bn</b></span>
                </div>
              </div>
            </div>

            {/* Who represents Lagos. */}
            <div data-panel="lagos" style={{ position: 'absolute', inset: 0, display: 'grid', gap: 22, alignContent: 'start', ...hidden }}>
              <div data-obj="LAGOS_CARD" style={card}>
                <div style={label}>South West zone</div>
                <h3 style={{ ...cardTitle, fontSize: 34, marginTop: 6 }}>Lagos State</h3>
                <div style={{ ...label, marginTop: 18 }}>Governor</div>
                <div style={{ marginTop: 10 }}>
                  <Person rep initials="BS" name="Babajide Sanwo-Olu" meta="Since 2019 · APC" />
                </div>
                <div style={{ ...label, marginTop: 20 }}>Your senators</div>
                <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                  <Person rep initials="WE" name="Wasiu Sanni Eshilokun" meta="Lagos Central · APC" />
                  <Person rep initials="AM" name="Adetokunbo Abiru Mukhail" meta="Lagos East · APC" />
                  <Person rep initials="OA" name="Oluranti Adebule" meta="Lagos West · APC" />
                </div>
                <div style={{ fontSize: 19, color: C.ash, marginTop: 16 }}>…and <span style={{ fontFamily: MONO, color: C.ink }}>24</span> members of the House of Representatives.</div>
              </div>
            </div>
          </div>
        </div>

        {/* The wheel: three captured states stacked; the direction swaps them. */}
        <div data-obj="WHEEL" style={{ position: 'absolute', left: 860, top: 40, width: 1000, height: 1000 }}>
          <img data-wheel="default" src={WHEEL} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transformOrigin: '50% 50%' }} />
          <img data-wheel="president" src={WHEEL_PRESIDENT} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transformOrigin: '50% 50%', ...hidden }} />
          <img data-wheel="lagos" src={WHEEL_LAGOS} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...hidden }} />
          {/* Where the President's office sits on the default wheel (measured from the capture: 48.7%, 68.8%). */}
          <span data-obj="PRESIDENT" style={{ position: 'absolute', left: '48.7%', top: '68.8%', width: 48, height: 48, marginLeft: -24, marginTop: -24, borderRadius: '50%' }} />
        </div>
      </div>

      {/* ───────────── Statement plate: one thing to read at a time ───────────── */}
      <div data-scene="say" style={{ position: 'absolute', inset: 0, background: 'rgba(233,235,230,0.95)', display: 'grid', placeItems: 'center', ...hidden }}>
        {SAYS.map((line, index) => (
          <h2 key={index} data-say={index} style={{ position: 'absolute', width: 1500, margin: 0, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 700, fontSize: 116, lineHeight: 1.06, letterSpacing: '-0.025em', color: C.ink, ...hidden }}>
            {line}
          </h2>
        ))}
      </div>

      {/* ───────────── Cold open ───────────── */}
      <div data-scene="title" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: C.canvas }}>
        <h1 data-title style={{ margin: 0, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 700, fontSize: 176, lineHeight: 1.02, letterSpacing: '-0.035em', color: C.ink }}>
          Who actually<br />runs Nigeria?
        </h1>
      </div>

      {/* ───────────── End card ───────────── */}
      <div data-scene="end" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: C.canvas, ...hidden }}>
        <div style={{ textAlign: 'center' }}>
          <h2 data-end-q style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 700, fontSize: 140, lineHeight: 1.04, letterSpacing: '-0.03em', color: C.ink }}>Who runs your state?</h2>
          <h2 data-end-a style={{ margin: '6px 0 0', display: 'inline-block', fontFamily: DISPLAY, fontWeight: 700, fontSize: 140, lineHeight: 1.1, letterSpacing: '-0.03em', color: C.green }}>Find out.</h2>
          <div data-end-pill style={{ margin: '54px auto 0', display: 'inline-flex', alignItems: 'center', gap: 22, padding: '20px 40px', borderRadius: 99, background: C.white, boxShadow: '0 6px 20px #0003' }}>
            <img data-logo src={MARK} alt="" style={{ width: 58, height: 58 }} />
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 62, letterSpacing: '-0.02em' }}>whoruns9ja.com</span>
          </div>
        </div>
      </div>
    </div>
  )
}
