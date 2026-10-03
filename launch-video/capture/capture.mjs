// Records the launch video's scenes from the live site, one clip per scene.
//
// Chrome's screencast (CDP) gives sharp 1080x1920 frames; Playwright's own recorder compresses them soft.
// Frames arrive only when the page changes, so each is held until the next one, then ffmpeg encodes a
// constant 30 fps H.264 clip. Taps are logged with their position and time so the video can draw a
// finger ripple where the real tap happened.
//
//   node capture/capture.mjs [scene ...]     (no args: every scene)
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = process.env.SITE ?? 'https://whoruns9ja.com'
const VIEW = { width: 360, height: 640 }
const SCALE = 3 // 1080x1920

/** Each scene gets a fresh phone (first-visit state), runs its steps and records them. */
const SCENES = {
	// 1–2: the wheel with its first-visit pulse, then the President's lines fanning out.
	async opening({ page, go, tap, swipe, hold }) {
		await go(`${SITE}/ng`)
		await page.locator('.map-hint').waitFor()
		await hold(3200)
		await tap(page.locator('.graph-svg .node[aria-label^="President of"]'))
		// The details sheet rises; pull it back down so the President's lines fan out across the whole map.
		await hold(1300)
		await swipe(page.locator('.sheet-grip'), 420)
		await hold(4200)
	},
}

async function record(name, scene) {
	const browser = await chromium.launch()
	const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: SCALE, isMobile: true, hasTouch: true, colorScheme: 'light', locale: 'en-NG' })
	const page = await context.newPage()
	const frames = []
	const taps = []
	const cdp = await context.newCDPSession(page)
	let start = 0
	cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
		frames.push({ data, t: metadata.timestamp })
		cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
	})

	const now = () => Date.now() / 1000
	const hold = (ms) => page.waitForTimeout(ms)
	const tap = async (locator) => {
		const box = await locator.first().boundingBox()
		taps.push({ t: now() - start, x: (box.x + box.width / 2) * SCALE, y: (box.y + box.height / 2) * SCALE })
		await locator.first().tap()
	}

	// A real finger drag (CDP touch events): Playwright's mouse drags don't get the implicit pointer capture
	// the sheet's grip relies on.
	const swipe = async (locator, dy, ms = 450) => {
		const box = await locator.first().boundingBox()
		const x = box.x + box.width / 2
		const y = box.y + box.height / 2
		const steps = 14
		taps.push({ t: now() - start, x: x * SCALE, y: y * SCALE, dy: dy * SCALE, ms, kind: 'swipe' })
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
		for (let i = 1; i <= steps; i++) {
			await page.waitForTimeout(ms / steps)
			await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (dy * i) / steps }] })
		}
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
	}
	// Load first, then start recording, so a clip opens on a drawn page rather than a blank one.
	const go = async (url) => {
		await page.goto(url, { waitUntil: 'networkidle' })
		await page.evaluate(() => document.fonts.ready)
		if (start) return
		await page.waitForTimeout(500)
		await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: VIEW.width * SCALE, maxHeight: VIEW.height * SCALE, everyNthFrame: 1 })
		start = now()
	}
	const run = scene({ page, go, tap, swipe, hold })
	await run
	const end = now()
	await cdp.send('Page.stopScreencast')
	await browser.close()

	// Hold each frame until the next arrives; the last until the scene ended.
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
	writeFileSync(join(ROOT, 'public/clips', `${name}.json`), JSON.stringify({ duration: end - start, taps }, null, '\t'))
	console.log(`${name}: ${kept.length} frames, ${(end - start).toFixed(1)}s, ${taps.length} taps → public/clips/${name}.mp4`)
}

const wanted = process.argv.slice(2)
for (const [name, scene] of Object.entries(SCENES)) {
	if (wanted.length && !wanted.includes(name)) continue
	await record(name, scene)
}
