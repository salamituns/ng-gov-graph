// Captures the live site's wheel SVG with computed paint inlined, so the film's set is the real map.
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
const OUT = new URL('.', import.meta.url).pathname
const PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'opacity', 'fill-opacity', 'stroke-opacity', 'font-family', 'font-size', 'font-weight', 'letter-spacing', 'text-anchor', 'display', 'visibility']
async function grab(page, name) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1800)
  const svg = await page.evaluate((PROPS) => {
    const src = document.querySelector('.graph-svg')
    const clone = src.cloneNode(true)
    const all = [src, ...src.querySelectorAll('*')]
    const copies = [clone, ...clone.querySelectorAll('*')]
    all.forEach((el, i) => {
      const cs = getComputedStyle(el), c = copies[i]
      const style = PROPS.map((p) => { const v = cs.getPropertyValue(p); return v && v !== 'normal' && v !== 'none' || p === 'fill' || p === 'stroke' ? `${p}:${v}` : '' }).filter(Boolean).join(';')
      c.setAttribute('style', style)
      c.removeAttribute('class'); c.removeAttribute('tabindex'); c.removeAttribute('role')
    })
    clone.removeAttribute('style')
    return clone.outerHTML
  }, PROPS)
  writeFileSync(`${OUT}${name}.svg`, svg)
  console.log(name, (svg.length / 1024).toFixed(0) + ' KB')
}
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 900 }, colorScheme: 'light' })
await p.addInitScript(() => localStorage.setItem('gg:map-hint-seen', '1'))
await p.goto('https://whoruns9ja.com/ng', { waitUntil: 'networkidle' }); await grab(p, 'wheel')
await p.goto('https://whoruns9ja.com/ng/elected/ng-president', { waitUntil: 'networkidle' }); await grab(p, 'wheel-president')
await p.goto('https://whoruns9ja.com/ng/represent/lagos', { waitUntil: 'networkidle' }); await grab(p, 'wheel-lagos')
await b.close(); process.exit(0)
