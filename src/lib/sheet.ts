/**
 * Where the phone's bottom sheet should sit when the reader arrives somewhere. The sheet answers the
 * navigation, so a change never happens out of sight:
 * - Map views whose content is the map area (Budget, Newsmakers) keep the sheet low.
 * - Pages that are mostly reading (who represents a state, the election guide, the budget, federal
 *   character) open it fully: the map is secondary there.
 * - A body, seat or state opens it halfway: its name and key facts, with the map still in view.
 * - Home lowers it, unless the reader jumped to a home section (the state picker).
 */
export type Snap = 'peek' | 'half' | 'full'

const READING = new Set(['represent', 'elections', 'budget', 'federal-character'])

export function snapFor(pathname: string, view: string | null, hash = ''): Snap {
	if (view === 'budget' || view === 'newsmakers' || view === 'power') return 'peek'
	const [, section] = pathname.split('/').filter(Boolean)
	if (!section) return hash ? 'half' : 'peek'
	if (READING.has(section)) return 'full'
	return 'half'
}

/** Snaps from lowest to highest, for drags and flicks that move one step at a time. */
export const SNAPS: Snap[] = ['peek', 'half', 'full']
