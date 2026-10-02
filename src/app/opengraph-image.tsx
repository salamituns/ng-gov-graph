import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NIGERIA_MAP } from '@/data/nigeria/map-shapes'

// The card shown when a link to the site is shared (WhatsApp, X, iMessage, Slack...). Every page inherits it.
export const alt = 'Who Runs Naija: Nigeria’s government, mapped and sourced'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Static TTFs: the renderer reads neither woff2 nor variable fonts.
const font = (file: string) => readFile(join(process.cwd(), 'assets/fonts', file))

const INK = '#fbf7ec'
const GREEN = '#0a7046'
const CORE_FILL = '#e6dcc2'
const STATE_FILL = '#f7f1e3'
const CORE_LINE = '#2f7a54'

export default async function Image() {
	const [display, body, bodyBold] = await Promise.all([font('bricolage-800.ttf'), font('hanken-500.ttf'), font('hanken-700.ttf')])
	const box = { w: NIGERIA_MAP.width + 4, h: NIGERIA_MAP.height + 4 }
	const star = Array.from({ length: 10 }, (_, index) => {
		const angle = -Math.PI / 2 + (index * Math.PI) / 5
		const radius = index % 2 ? 1.6 : 3.6
		return `${(NIGERIA_MAP.abuja.x + Math.cos(angle) * radius).toFixed(2)} ${(NIGERIA_MAP.abuja.y + Math.sin(angle) * radius).toFixed(2)}`
	}).join(' L ')

	return new ImageResponse(
		(
			<div style={{ width: '100%', height: '100%', display: 'flex', background: GREEN, color: INK, fontFamily: 'Hanken' }}>
				<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: 640, paddingLeft: 76 }}>
					<div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.06em', color: '#c6f0da' }}>WHORUNS9JA.COM</div>
					<div style={{ display: 'flex', flexDirection: 'column', marginTop: 22, fontFamily: 'Bricolage', fontSize: 118, lineHeight: 0.95, letterSpacing: '-0.03em' }}>
						<span>Who Runs</span>
						<span>Naija</span>
					</div>
					<div style={{ marginTop: 34, fontSize: 38, lineHeight: 1.25, color: '#e3f3ea' }}>Nigeria’s government, mapped and sourced.</div>
					<div style={{ marginTop: 26, fontSize: 24, color: '#a9d8bf' }}>Presidency · Assembly · Courts · 36 states + FCT</div>
				</div>
				<div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
					{/* The map's centrepiece, as on the site: Nigeria in a ringed medallion. */}
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 460, height: 460, borderRadius: 230, background: CORE_FILL, border: `12px solid ${INK}`, boxShadow: '0 24px 60px rgba(0,0,0,0.28)' }}>
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 412, height: 412, borderRadius: 206, border: `3px solid ${CORE_LINE}` }}>
							<svg width={330} height={(330 * box.h) / box.w} viewBox={`${-box.w / 2} ${-box.h / 2} ${box.w} ${box.h}`}>
								{Object.entries(NIGERIA_MAP.states).map(([id, d]) => (
									<path key={id} d={d} fill={STATE_FILL} stroke={CORE_LINE} strokeWidth={0.7} strokeLinejoin="round" />
								))}
								<path d={`M ${star} Z`} fill="#008751" />
							</svg>
						</div>
					</div>
				</div>
			</div>
		),
		{
			...size,
			fonts: [
				{ name: 'Bricolage', data: display, weight: 800, style: 'normal' },
				{ name: 'Hanken', data: body, weight: 500, style: 'normal' },
				{ name: 'Hanken', data: bodyBold, weight: 700, style: 'normal' },
			],
		},
	)
}
