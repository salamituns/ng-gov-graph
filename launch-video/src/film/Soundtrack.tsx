import { Sequence, getStaticFiles, interpolate, staticFile } from 'remotion'
import { Audio } from '@remotion/media'
import type { ShotProps } from './Shot'

type Placed = ShotProps & { to: number }

/** A sound at a moment in the film (seconds), at a level. */
type Hit = { at: number; sound: 'click' | 'whoosh' | 'rise' | 'resolve'; volume: number }

/**
 * The film's sound, derived from its own timeline: a click on every real click in the capture logs, a whoosh
 * on each scene change and big camera move, a rise under the title and a chord as the end card lands.
 */
export function soundHits(shots: Placed[], title: number): Hit[] {
	const hits: Hit[] = [{ at: 0.05, sound: 'rise', volume: 0.5 }]
	let start = title
	for (const shot of shots) {
		hits.push({ at: Math.max(0, start - 0.25), sound: 'whoosh', volume: 0.28 })
		const local = (t: number) => start + t - shot.from
		const clicks = shot.log.clicks.filter((click, index, all) => index === 0 || click.t - all[index - 1].t > 0.15)
		for (const click of clicks) if (click.t >= shot.from && click.t <= shot.to) hits.push({ at: local(click.t), sound: 'click', volume: 0.42 })
		shot.camera.forEach((key, index) => {
			const next = shot.camera[index + 1]
			if (next && Math.abs(next.scale - key.scale) >= 0.2 && key.t >= shot.from) hits.push({ at: local(key.t), sound: 'whoosh', volume: 0.16 })
		})
		start += shot.to - shot.from
	}
	hits.push({ at: start - 0.2, sound: 'whoosh', volume: 0.28 }, { at: start + 0.55, sound: 'resolve', volume: 0.5 })
	return hits
}

const MUSIC = 'music/bed.mp3'

/** Effects always; a music bed only where asked for and only once a track has been added to public/music. */
export function Soundtrack({ hits, fps, total, music = false }: { hits: Hit[]; fps: number; total: number; music?: boolean }) {
	const hasMusic = music && getStaticFiles().some((file) => file.name === MUSIC)
	return (
		<>
			{hits.map((hit, index) => (
				<Sequence key={index} from={Math.round(hit.at * fps)} layout="none">
					<Audio src={staticFile(`sfx/${hit.sound}.wav`)} volume={hit.volume} />
				</Sequence>
			))}
			{hasMusic ? (
				<Audio
					src={staticFile(MUSIC)}
					// Under everything: in over two seconds, out over the last three, never louder than the effects.
					volume={(f) => 0.16 * interpolate(f, [0, 2 * fps, total - 3 * fps, total], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
				/>
			) : null}
		</>
	)
}
