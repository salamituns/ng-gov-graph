import { NIGERIA_MAP } from '@/data/nigeria/map-shapes'

const OUTLINE = Object.values(NIGERIA_MAP.states).join('')

/** Nigeria's silhouette, the app's mark: states filled and stroked alike so their seams disappear. */
export function NigeriaMark({ size = 22 }: { size?: number }) {
	const box = NIGERIA_MAP.width + 4
	return (
		<svg viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`} width={size} height={size} aria-hidden="true" className="nigeria-mark">
			<path d={OUTLINE} fill="currentColor" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" />
		</svg>
	)
}
