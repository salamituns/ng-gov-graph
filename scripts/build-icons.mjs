// Builds the app icons from the Nigeria map: src/app/icon.svg, apple-icon.png and favicon.ico.
// Run after build-nigeria-map.mjs: node scripts/build-icons.mjs (macOS: uses Chrome headless and sips).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const GREEN = '#008751'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const source = readFileSync(new URL('../src/data/nigeria/map-shapes.ts', import.meta.url), 'utf8')
const states = JSON.parse(source.slice(source.indexOf('states: {') + 8, source.indexOf('} as Record') + 1))
const [width, height] = [120, Number(source.match(/height: ([\d.]+)/)[1])]
const abuja = source.match(/abuja: \{ x: (-?[\d.]+), y: (-?[\d.]+) \}/).slice(1).map(Number)
const outline = Object.values(states).join('')

/** The silhouette: states filled and stroked in one colour so the seams between them disappear. */
function silhouette({ pad, background, star }) {
	const box = Math.max(width, height) + pad * 2
	const starPath = Array.from({ length: 10 }, (_, index) => {
		const angle = -Math.PI / 2 + (index * Math.PI) / 5
		const r = index % 2 ? 1.6 : 3.6
		return `${(abuja[0] + Math.cos(angle) * r).toFixed(2)} ${(abuja[1] + Math.sin(angle) * r).toFixed(2)}`
	}).join(' L ')
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-box / 2} ${-box / 2} ${box} ${box}">${
		background ? `<rect x="${-box / 2}" y="${-box / 2}" width="${box}" height="${box}" fill="${background}"/>` : ''
	}<path d="${outline}" fill="${GREEN}" stroke="${GREEN}" stroke-width="1.4" stroke-linejoin="round"/>${
		star ? `<path d="M ${starPath} Z" fill="#ffffff"/>` : ''
	}</svg>`
}

const app = new URL('../src/app/', import.meta.url).pathname
writeFileSync(join(app, 'icon.svg'), silhouette({ pad: 2, background: null, star: false }) + '\n')

function render(svg, size, file) {
	const dir = mkdtempSync(join(tmpdir(), 'ng-icon-'))
	const html = join(dir, 'icon.html')
	writeFileSync(html, `<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="width:${size}px;height:${size}px;display:block"></body></html>`)
	execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000', `--window-size=${size},${size}`, `--screenshot=${file}`, `file://${html}`], { stdio: 'ignore' })
	return file
}

// Apple touch icon: white square, iOS rounds the corners; the capital's star shows at this size.
const tmp = mkdtempSync(join(tmpdir(), 'ng-icons-'))
render(silhouette({ pad: 22, background: '#ffffff', star: true }), 180, join(app, 'apple-icon.png'))

// favicon.ico for older browsers: 16 and 32 px PNGs, rendered large and scaled down, in one ICO file.
const big = render(silhouette({ pad: 3, background: null, star: false }), 256, join(tmp, 'big.png'))
const pngs = [16, 32].map((size) => {
	const out = join(tmp, `${size}.png`)
	execFileSync('sips', ['-z', String(size), String(size), big, '--out', out], { stdio: 'ignore' })
	return { size, data: readFileSync(out) }
})
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(pngs.length, 4)
let offset = 6 + 16 * pngs.length
const entries = pngs.map(({ size, data }) => {
	const entry = Buffer.alloc(16)
	entry.writeUInt8(size, 0)
	entry.writeUInt8(size, 1)
	entry.writeUInt16LE(1, 4)
	entry.writeUInt16LE(32, 6)
	entry.writeUInt32LE(data.length, 8)
	entry.writeUInt32LE(offset, 12)
	offset += data.length
	return entry
})
writeFileSync(join(app, 'favicon.ico'), Buffer.concat([header, ...entries, ...pngs.map((png) => png.data)]))
console.log('wrote icon.svg, apple-icon.png, favicon.ico')
