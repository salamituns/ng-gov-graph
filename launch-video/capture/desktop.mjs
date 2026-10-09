// Records the launch film's scenes from the live site on a desktop browser, one clip per scene.
//
// 1600x900 at 2x gives 3200x1800 frames, enough to push in on a detail and stay crisp. Chrome's screencast
// (CDP) sends a frame whenever the page changes; each is held until the next, and ffmpeg encodes a
// constant 30 fps clip. The headless browser draws no cursor, so every pointer position, click and URL
// is logged with its time; the film draws the cursor from that log, exactly where the real one was.
//
//   node capture/desktop.mjs [scene ...]     (no args: every scene)
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = process.env.SITE ?? 'https://whoruns9ja.com'
const VIEW = { width: 1600, height: 900 }
const SCALE = 2

const SCENES = {
	/** The map on a first visit (hint and pulse), a look around, then the President: his lines fan out. */
	async map({ go, moveTo, click, hover, hold, page }) {
		await go('/ng', { firstVisit: true })
		await hold(2600)
		await moveTo({ x: 1240, y: 560 }, 900)
		await hover(page.locator('.graph-svg .node[aria-label^="Federal Ministry of Finance"]').first(), 800)
		await hold(700)
		await hover(page.locator('.graph-svg .node[aria-label^="Senate of Nigeria"]').first(), 900)
		await hold(700)
		await click(page.locator('.graph-svg .node[aria-label^="President of"]'), 900)
		await hold(3400)
	},
	/** The map for the narrated cut: a shorter look around, the click sooner, then a long hold on the fan-out. */
	async mapvo({ go, moveTo, click, hover, hold, page }) {
		await go('/ng', { firstVisit: true })
		await hold(1800)
		await moveTo({ x: 1240, y: 560 }, 800)
		await hover(page.locator('.graph-svg .node[aria-label^="Federal Ministry of Finance"]').first(), 700)
		await hold(500)
		await click(page.locator('.graph-svg .node[aria-label^="President of"]'), 900)
		await hold(7500)
	},
	/** "Most covered this week": a topic in the news, the offices responsible for it, and one of them's budget. */
	async news({ go, click, hover, scrollPanel, hold, page }) {
		await go('/ng')
		await hold(1000)
		await hover(page.locator('.trending-chips a', { hasText: 'Education' }).first(), 900)
		await hold(400)
		await click(page.locator('.trending-chips a', { hasText: 'Education' }).first(), 200)
		await page.waitForURL(/topics\/education/)
		await hold(2800)
		await click(page.locator('.topic-bodies a', { hasText: 'Federal Ministry of Education' }).first(), 900)
		await page.waitForURL(/ministry-of-education/)
		await hold(1800)
		await scrollPanel(page.locator('.budget-card').first(), 1300)
		await hold(6500)
	},
	/** Search for a ministry, open it, and read its budget. */
	async education({ go, moveTo, click, type, scrollPanel, hold, page }) {
		await go('/ng')
		await hold(900)
		await click(page.locator('button[aria-label^="Search graph"]'), 800)
		await hold(400)
		await type('Education', 110)
		await hold(900)
		await click(page.locator('.graph-search-results a', { hasText: 'Federal Ministry of Education' }).first(), 700)
		await hold(2600)
		await scrollPanel(page.locator('.budget-card').first(), 1400)
		await hold(3200)
	},
	/** Pick a state and meet its representatives. */
	async represent({ go, click, choose, scrollPanel, hold, page }) {
		await go('/ng')
		await hold(900)
		await click(page.locator('.represent-picker select, select:has(option:text-is("Lagos State"))').first(), 900, { noClick: true })
		await choose(page.locator('select:has(option:text-is("Lagos State"))').first(), 'Lagos State')
		await page.waitForURL(/represent\/lagos/)
		await hold(2600)
		await scrollPanel(page.locator('text=Your members of the House of Representatives').first(), 2200)
		await hold(2600)
	},
	/** The budget view: money flowing from the total into ministries; open one. */
	async budget({ go, click, hover, hold, page }) {
		await go('/ng')
		await hold(800)
		await click(page.locator('.map-views button', { hasText: 'Budget' }), 900)
		await hold(2400)
		await hover(page.locator('.flow-label', { hasText: 'Education' }).first(), 1000)
		await hold(700)
		await click(page.locator('.flow-label', { hasText: 'Education' }).first(), 300)
		await hold(3200)
	},
	/** The election countdown on the home panel. */
	async election({ go, moveTo, hold, page }) {
		await go('/ng')
		await hold(600)
		await moveTo(page.locator('.election-count').first(), 1100)
		// Long enough to sit under a spoken line as well as a caption.
		await hold(7200)
	},
}

async function record(name, scene) {
	const browser = await chromium.launch()
	const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: SCALE, colorScheme: 'light', locale: 'en-NG' })
	const page = await context.newPage()
	const cdp = await context.newCDPSession(page)
	const frames = []
	const log = { pointer: [], clicks: [], urls: [] }
	let start = 0
	let cursor = { x: VIEW.width * 0.62, y: VIEW.height * 0.72 }
	cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
		frames.push({ data, t: metadata.timestamp })
		cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
	})
	const now = () => Date.now() / 1000
	const stamp = () => (start ? now() - start : 0)
	page.on('framenavigated', (frame) => { if (frame === page.mainFrame() && start) log.urls.push({ t: stamp(), url: frame.url() }) })

	const hold = (ms) => page.waitForTimeout(ms)
	const point = async (target) => {
		if (!target.boundingBox) return target
		const box = await target.first().boundingBox()
		return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
	}
	/** Glide the pointer along a slightly curved, eased path, as a hand does. */
	const moveTo = async (target, ms = 800) => {
		const to = await point(target)
		const from = { ...cursor }
		const steps = Math.max(8, Math.round(ms / 16))
		const bend = { x: (to.y - from.y) * 0.12, y: (from.x - to.x) * 0.12 }
		for (let i = 1; i <= steps; i++) {
			const t = i / steps
			const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
			const arc = Math.sin(Math.PI * t)
			cursor = { x: from.x + (to.x - from.x) * e + bend.x * arc, y: from.y + (to.y - from.y) * e + bend.y * arc }
			await page.mouse.move(cursor.x, cursor.y)
			log.pointer.push({ t: stamp(), x: cursor.x * SCALE, y: cursor.y * SCALE })
			await page.waitForTimeout(ms / steps)
		}
	}
	const hover = (target, ms) => moveTo(target, ms)
	const click = async (target, ms = 800, { noClick = false } = {}) => {
		await moveTo(target, ms)
		await page.waitForTimeout(120)
		log.clicks.push({ t: stamp(), x: cursor.x * SCALE, y: cursor.y * SCALE })
		if (!noClick) await page.mouse.click(cursor.x, cursor.y)
	}
	const choose = async (select, label) => {
		log.clicks.push({ t: stamp(), x: cursor.x * SCALE, y: cursor.y * SCALE })
		await select.selectOption({ label })
	}
	const type = (text, delay) => page.keyboard.type(text, { delay })
	/** Scroll the side panel smoothly until `target` sits near the top of it. */
	const scrollPanel = async (target, ms = 1400) => {
		await moveTo({ x: 330, y: 520 }, 500)
		const panel = page.locator('.shell-panel')
		const from = await panel.evaluate((el) => el.scrollTop)
		const to = await target.evaluate((el) => {
			const host = el.closest('.shell-panel')
			return host.scrollTop + el.getBoundingClientRect().top - host.getBoundingClientRect().top - 90
		})
		const steps = Math.round(ms / 16)
		for (let i = 1; i <= steps; i++) {
			const t = i / steps
			const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
			await panel.evaluate((el, y) => { el.scrollTop = y }, from + (to - from) * e)
			await page.waitForTimeout(ms / steps)
		}
	}
	/** Load a page, then start recording on the drawn page. Later scenes play a returning visitor (no hint). */
	const go = async (path, { firstVisit = false } = {}) => {
		if (!firstVisit) await page.addInitScript(() => localStorage.setItem('gg:map-hint-seen', '1'))
		await page.goto(`${SITE}${path}`, { waitUntil: 'networkidle' })
		await page.evaluate(() => document.fonts.ready)
		await page.mouse.move(cursor.x, cursor.y)
		await page.waitForTimeout(500)
		await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: VIEW.width * SCALE, maxHeight: VIEW.height * SCALE, everyNthFrame: 1 })
		start = now()
		log.urls.push({ t: 0, url: page.url() })
		log.pointer.push({ t: 0, x: cursor.x * SCALE, y: cursor.y * SCALE })
	}

	await scene({ page, go, moveTo, hover, click, choose, type, scrollPanel, hold })
	const end = now()
	await cdp.send('Page.stopScreencast')
	await browser.close()

	const dir = join(ROOT, 'capture/frames', name)
	rmSync(dir, { recursive: true, force: true })
	mkdirSync(dir, { recursive: true })
	const kept = frames.filter((frame) => frame.t >= start - 0.05)
	const list = kept.map((frame, index) => {
		const file = `${String(index).padStart(5, '0')}.jpg`
		writeFileSync(join(dir, file), Buffer.from(frame.data, 'base64'))
		const next = kept[index + 1]?.t ?? end
		return `file '${file}'\nduration ${Math.max(0.001, next - Math.max(frame.t, start)).toFixed(4)}`
	})
	list.push(`file '${String(kept.length - 1).padStart(5, '0')}.jpg'`)
	writeFileSync(join(dir, 'list.txt'), list.join('\n') + '\n')
	const out = join(ROOT, 'public/clips', `${name}.mp4`)
	mkdirSync(dirname(out), { recursive: true })
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'),
		'-vf', `fps=30,scale=${VIEW.width * SCALE}:${VIEW.height * SCALE}:flags=lanczos,format=yuv420p`,
		'-c:v', 'libx264', '-preset', 'slow', '-crf', '14', out])
	writeFileSync(join(ROOT, 'public/clips', `${name}.json`), JSON.stringify({ duration: end - start, ...log }))
	console.log(`${name}: ${kept.length} frames, ${(end - start).toFixed(1)}s, ${log.clicks.length} clicks, ${log.urls.length} urls`)
}

const wanted = process.argv.slice(2)
for (const [name, scene] of Object.entries(SCENES)) {
	if (wanted.length && !wanted.includes(name)) continue
	await record(name, scene)
}
