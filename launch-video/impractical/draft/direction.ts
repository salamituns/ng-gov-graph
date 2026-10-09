import type { Direction } from '../../src/stage/engine'

export const output = { width: 1920, height: 1080, fps: 30 }

const SAY = (n: number) => `[data-say="${n}"]`
const OBJ = (id: string) => `[data-obj="${id}"]`

const direction: Direction = (ctx) => {
  const { tl, gsap, camera, text, transition, cursor, highlight, fx, mask, logo, ui, light, shade } = ctx

  // The wheels are images on a CDN: no frame renders before they have decoded.
  ctx.__await(Promise.all(ctx.qa('img').map((img) => (img as HTMLImageElement).decode().catch(() => undefined))))

  // ── World: map-canvas ground with the site's quiet dot texture, one held vignette, one scene light ──
  ctx.backdrop('dot-grid', { base: '#e9ebe6', energy: 0.2 })
  shade.vignette({ strength: 0.14 }, 0)
  light.set({ angle: 135, warmth: 0.6 })

  // Static frame-0 state (hidden in markup too): only the cold open is showing.
  gsap.set(['[data-scene="product"]', '[data-scene="say"]', '[data-say]', '[data-scene="end"]'], { autoAlpha: 0 })
  gsap.set(['[data-panel="president"]', '[data-panel="topic"]', '[data-panel="ministry"]', '[data-panel="lagos"]', '[data-wheel="president"]', '[data-wheel="lagos"]'], { autoAlpha: 0 })

  /** Say it: a statement plate over the product, the line rising in, a reading hold, then out. Returns the end. */
  const say = (n: number, at: number, read: number) => {
    tl.set(['[data-scene="say"]', SAY(n)], { autoAlpha: 1 }, at)
    const enter = text.reveal(SAY(n), 'rise', { by: 'lines', duration: 0.55, stagger: 0.2, ease: 'promo-out' }, at)
    const outAt = at + enter.duration + read
    const exit = text.exit(SAY(n), 'rise', { by: 'lines', duration: 0.35, stagger: 0.08, ease: 'promo-in' }, outAt)
    const end = outAt + exit.duration
    tl.set([SAY(n), '[data-scene="say"]'], { autoAlpha: 0 }, end)
    return end
  }

  // ── 1. Cold open: the question, then a dive through the "o" into the map ──
  const title = text.reveal('[data-title]', 'rise', { by: 'lines', duration: 0.6, stagger: 0.2, ease: 'promo-out' }, 0.25)
  const diveAt = 0.25 + title.duration + 0.85
  const dive = transition.through('[data-title]', {
    via: 'glyph',
    char: 'o',
    duration: 0.55,
    outDuration: 1.0,
    swap: { hide: '[data-scene="title"]', show: '[data-scene="product"]' },
  }, diveAt)
  ctx.blur(diveAt + 0.2, dive.cutAt + 0.35, { tier: 'full' })
  let t = diveAt + dive.duration

  // ── 2. The product, whole: let it be seen before anything is cropped ──
  light.sweep(OBJ('WHEEL'), { duration: 1.3, intensity: 0.32 }, t + 0.1)
  t = say(0, t + 1.5, 1.25)

  // ── 3. Click any office: the President's lines fan out across the government ──
  camera.focus(OBJ('WHEEL'), { height: 0.98 }, t)
  t = say(1, t + 1.0, 0.7)
  const press = cursor.click(OBJ('PRESIDENT'), { duration: 0.9, then: 'park' }, t)
  const hit = t + press.duration
  // The site turns the wheel so the chosen office sits at the bottom: both states turn together, the selected
  // one revealed outward from the President's office as it settles.
  tl.set('[data-wheel="president"]', { autoAlpha: 1, rotation: 3.96 }, hit)
  tl.to('[data-wheel="default"]', { rotation: -3.96, duration: 0.9, ease: 'promo-inout' }, hit)
  tl.to('[data-wheel="president"]', { rotation: 0, duration: 0.9, ease: 'promo-inout' }, hit)
  mask.reveal('[data-wheel="president"]', 'radial', { at: { x: 0.49, y: 0.69 }, duration: 1.2, ease: 'promo-out' }, hit)
  tl.set('[data-wheel="default"]', { autoAlpha: 0 }, hit + 1.2)
  tl.set('[data-panel="home"]', { autoAlpha: 0 }, hit)
  tl.set('[data-panel="president"]', { autoAlpha: 1 }, hit)
  cursor.exit({}, hit + 0.5)
  fx.spike('[data-wheel="president"]', 'bloom', { amount: 0.6, duration: 0.9 }, hit + 0.35)
  t = hit + 2.2

  // ── 4. Who holds it, and who put them there ──
  t = say(2, t, 1.3)
  camera.focus(OBJ('PRES_CARD'), { height: 0.86 }, t)
  highlight.ring(OBJ('HOLDER'), { color: '#008751', thickness: 4, persist: 1.6 }, t + 1.0)
  t += 3.0

  // ── 5. This week's news, and the office responsible ──
  // Under the plate: back to the home panel and the default wheel.
  const backAt = say(3, t, 1.6)
  tl.set('[data-panel="president"]', { autoAlpha: 0 }, backAt - 0.05)
  tl.set('[data-panel="home"]', { autoAlpha: 1 }, backAt - 0.05)
  tl.set('[data-wheel="president"]', { autoAlpha: 0 }, backAt - 0.05)
  tl.set('[data-wheel="default"]', { autoAlpha: 1, rotation: 0 }, backAt - 0.05)
  camera.move(camera.full(), { duration: 0.01 }, backAt - 0.05) // instant reframe behind the plate
  t = backAt + 0.2
  // Whip to the news card: one blur spike hides the travel.
  camera.focus(OBJ('NEWS_CARD'), { height: 0.6, duration: 0.45, ease: 'promo-inout' }, t)
  fx.spike(OBJ('PRODUCT'), 'blur', { amount: 12, duration: 0.45 }, t)
  ctx.blur(t, t + 0.45, { tier: 'full' })
  highlight.spotlight(OBJ('EDU_CHIP'), { dim: 0.45, persist: 1.3, duration: 0.5 }, t + 0.6)
  const chip = cursor.click(OBJ('EDU_CHIP'), { duration: 0.9, then: 'park' }, t + 0.7)
  const topicAt = t + 0.7 + chip.duration
  tl.set('[data-panel="home"]', { autoAlpha: 0 }, topicAt)
  tl.set('[data-panel="topic"]', { autoAlpha: 1 }, topicAt)
  mask.reveal(OBJ('TOPIC_CARD'), 'feather', { direction: 'down', softness: 0.3, duration: 0.6, ease: 'promo-out' }, topicAt)
  camera.focus(OBJ('TOPIC_CARD'), { height: 0.78 }, topicAt + 0.15)
  highlight.marker(OBJ('EDU_MINISTRY_LINK'), { color: '#9bdcb7', duration: 0.6, persist: 'hold' }, topicAt + 1.1)
  const toMinistry = cursor.click(OBJ('EDU_MINISTRY_LINK'), { duration: 0.8, then: 'exit' }, topicAt + 2.0)
  t = topicAt + 2.0 + toMinistry.duration + 0.2

  // ── 6. Follow the money ──
  const moneyAt = say(4, t, 0.8)
  tl.set('[data-panel="topic"]', { autoAlpha: 0 }, moneyAt - 0.05)
  tl.set('[data-panel="ministry"]', { autoAlpha: 1 }, moneyAt - 0.05)
  gsap.set(OBJ('SPEND_BAR'), { scaleX: 0 })
  camera.focus(OBJ('BUDGET'), { height: 0.66 }, moneyAt)
  const countAt = moneyAt + 0.9
  const count = text.count('[data-count]', { from: 0, to: 2560, duration: 1.2, ease: 'promo-soft' }, countAt)
  tl.to(OBJ('SPEND_BAR'), { scaleX: 1, duration: 1.2, ease: 'promo-soft' }, countAt)
  ui.set(OBJ('BUDGET_FIGURE'), { text: '₦2.56T', flash: true }, countAt + count.duration + 0.1)
  fx.spike(OBJ('BUDGET_FIGURE'), 'bloom', { amount: 0.8, duration: 0.8 }, countAt + count.duration + 0.1)
  highlight.marker(OBJ('PER_PERSON'), { color: '#9bdcb7', duration: 0.6, persist: 'hold' }, countAt + count.duration + 0.7)
  t = countAt + count.duration + 2.2

  // ── 7. Make it personal: about ₦10,600 each ──
  t = say(5, t, 1.2)

  // ── 8. Your own representatives, by name ──
  const lagosAt = say(6, t, 1.4)
  tl.set('[data-panel="ministry"]', { autoAlpha: 0 }, lagosAt - 0.05)
  tl.set('[data-panel="lagos"]', { autoAlpha: 1 }, lagosAt - 0.05)
  tl.set('[data-wheel="default"]', { autoAlpha: 0 }, lagosAt - 0.05)
  tl.set('[data-wheel="lagos"]', { autoAlpha: 1 }, lagosAt - 0.05)
  camera.move(camera.full(), { duration: 0.01 }, lagosAt - 0.05)
  ctx.dropIn('[data-rep]', { from: lagosAt + 0.4, stagger: 0.09 })
  camera.focus(OBJ('LAGOS_CARD'), { height: 0.9 }, lagosAt + 1.6)
  t = lagosAt + 3.6

  // ── 9. The election, then hand the question to the viewer ──
  t = say(7, t, 1.3)
  tl.set(['[data-scene="product"]'], { autoAlpha: 0 }, t)
  tl.set('[data-scene="end"]', { autoAlpha: 1 }, t)
  camera.move(camera.full(), { duration: 0.01 }, t)
  const q = text.reveal('[data-end-q]', 'rise', { by: 'lines', duration: 0.6, ease: 'promo-out' }, t + 0.1)
  const a = text.reveal('[data-end-a]', 'rise', { by: 'words', duration: 0.55, stagger: 0.12, ease: 'promo-out' }, t + 0.1 + q.duration)
  mask.fill('[data-end-a]', { gradient: 'linear-gradient(90deg,#066b3f,#1ea968,#008751,#066b3f)', drift: 60, duration: 2.4 }, t + 0.1 + q.duration)
  const pillAt = t + 0.1 + q.duration + a.duration + 0.15
  mask.reveal('[data-end-pill]', 'feather', { direction: 'up', softness: 0.35, duration: 0.6, ease: 'promo-out' }, pillAt)
  logo.reveal('[data-logo]', 'iris', { duration: 0.6, ease: 'promo-out' }, pillAt + 0.1)
  logo.shine('[data-logo]', { duration: 0.9 }, pillAt + 0.8)
  fx.spike('[data-end-a]', 'bloom', { amount: 0.7, duration: 0.9 }, pillAt + 0.4)
  ctx.hold(2.4, pillAt + 0.9)
}

export default direction
