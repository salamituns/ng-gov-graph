import { Series } from 'remotion'
import { Stage } from './Stage'
import { Shot, type ShotProps } from './Shot'
import { EndCard, TitleCard } from './Cards'
import { Soundtrack, soundHits } from './Soundtrack'
import map from '../../public/clips/map.json'
import represent from '../../public/clips/represent.json'
import budget from '../../public/clips/budget.json'
import election from '../../public/clips/election.json'

export const FPS = 30

/** Camera and captions per scene. Times are seconds into each clip; x/y are clip pixels (page CSS x2). */
const SHOTS: Array<ShotProps & { to: number }> = [
	{
		clip: 'map', log: map, from: 0.6, to: 13.0,
		camera: [
			{ t: 0.6, scale: 1, x: 1600, y: 900 },
			{ t: 3.0, scale: 1, x: 1600, y: 900 },
			{ t: 4.8, scale: 1.4, x: 2240, y: 900 },
			{ t: 9.6, scale: 1.4, x: 2240, y: 900 },
			// After the click: pull back to the whole page, the holder's card and the fan-out side by side.
			{ t: 11.0, scale: 1, x: 1600, y: 900 },
			{ t: 13.0, scale: 1.03, x: 1600, y: 860 },
		],
		cues: [
			{ from: 0.9, to: 8.9, headline: 'Every office in Nigeria’s government.', detail: 'One map: 194 organisations, every link sourced.' },
			{ from: 9.6, to: 13.0, headline: 'Click any office.', detail: 'See who holds it, and who put them there.' },
		],
	},
	{
		clip: 'represent', log: represent, from: 1.4, to: 13.3,
		camera: [
			{ t: 1.4, scale: 1.35, x: 640, y: 1080 },
			{ t: 2.7, scale: 1.35, x: 640, y: 1080 },
			{ t: 3.8, scale: 1, x: 1600, y: 900 },
			{ t: 5.6, scale: 1, x: 1600, y: 900 },
			{ t: 7.0, scale: 1.3, x: 640, y: 950 },
			{ t: 13.3, scale: 1.3, x: 640, y: 1000 },
		],
		cues: [
			{ from: 1.5, to: 5.4, headline: 'Who represents you?', detail: 'Pick your state.' },
			{ from: 5.7, to: 13.3, headline: 'Your governor. Your senators. Your reps.', detail: 'By name, with party and photo.' },
		],
	},
	{
		clip: 'budget', log: budget, from: 1.4, to: 10.5,
		camera: [
			{ t: 1.4, scale: 1, x: 1600, y: 900 },
			{ t: 3.4, scale: 1, x: 1600, y: 900 },
			{ t: 4.8, scale: 1.4, x: 2140, y: 1380 },
			{ t: 7.0, scale: 1.4, x: 2300, y: 1320 },
			{ t: 8.6, scale: 1.55, x: 700, y: 1280 },
			{ t: 10.5, scale: 1.55, x: 700, y: 1280 },
		],
		cues: [
			{ from: 3.1, to: 7.3, headline: '₦68 trillion budget.', detail: 'Follow where every naira goes.' },
			{ from: 7.7, to: 10.5, headline: 'Education: ₦2.56 trillion.', detail: 'About ₦10,600 for every Nigerian.' },
		],
	},
	{
		clip: 'election', log: election, from: 0.3, to: 5.3,
		camera: [
			{ t: 0.3, scale: 1, x: 1600, y: 900 },
			{ t: 1.9, scale: 1.9, x: 620, y: 690 },
			{ t: 5.3, scale: 1.95, x: 620, y: 690 },
		],
		cues: [{ from: 1.2, to: 5.3, headline: 'Elections: 16 January 2027.', detail: 'Know what each office does before you vote.' }],
	},
]

const TITLE = 2.6
const END = 5.2
export const FILM_FRAMES = Math.round((TITLE + END + SHOTS.reduce((sum, shot) => sum + shot.to - shot.from, 0)) * FPS)

export function Film() {
	return (
		<Stage>
			<Soundtrack hits={soundHits(SHOTS, TITLE)} fps={FPS} total={FILM_FRAMES} music />
			<Series>
				<Series.Sequence durationInFrames={Math.round(TITLE * FPS)}>
					<TitleCard lines={['Who actually', 'runs Nigeria?']} />
				</Series.Sequence>
				{SHOTS.map(({ to, ...shot }) => (
					<Series.Sequence key={shot.clip} durationInFrames={Math.round((to - shot.from) * FPS)}>
						<Shot {...shot} />
					</Series.Sequence>
				))}
				<Series.Sequence durationInFrames={Math.round(END * FPS)}>
					<EndCard />
				</Series.Sequence>
			</Series>
		</Stage>
	)
}

/** The vertical cut: same clips and timing, portrait camera (the half of the page that matters) and big top captions. */
const VERTICAL: Array<ShotProps & { to: number }> = [
	{
		clip: 'map', log: map, from: 0.6, to: 13.0, layout: 'portrait',
		camera: [
			{ t: 0.6, scale: 1, x: 2240, y: 900 },
			{ t: 3.0, scale: 1, x: 2240, y: 900 },
			{ t: 4.8, scale: 1.2, x: 2240, y: 900 },
			{ t: 9.7, scale: 1.2, x: 2240, y: 900 },
			{ t: 10.3, scale: 1.05, x: 2240, y: 900 },
			{ t: 10.9, scale: 1.05, x: 2240, y: 900 },
			// Then across to the panel, well before the shot fades: who holds the office.
			{ t: 11.7, scale: 1.25, x: 600, y: 420 },
			{ t: 13.0, scale: 1.25, x: 600, y: 420 },
		],
		cues: [
			{ from: 0.9, to: 8.9, headline: 'Every office in Nigeria’s government.', detail: 'One map. Every link sourced.' },
			{ from: 9.6, to: 11.3, headline: 'Click any office.', detail: 'See the powers it holds.' },
			{ from: 11.3, to: 13.0, headline: 'And who holds it.', detail: 'Name, party, and since when.' },
		],
	},
	{
		clip: 'represent', log: represent, from: 1.4, to: 13.3, layout: 'portrait',
		camera: [
			{ t: 1.4, scale: 1.2, x: 640, y: 1080 },
			{ t: 2.8, scale: 1.2, x: 640, y: 1080 },
			{ t: 3.8, scale: 1, x: 2240, y: 900 },
			{ t: 5.6, scale: 1, x: 2240, y: 900 },
			{ t: 6.8, scale: 1.12, x: 640, y: 950 },
			{ t: 13.3, scale: 1.12, x: 640, y: 1000 },
		],
		cues: [
			{ from: 1.5, to: 5.4, headline: 'Who represents you?', detail: 'Pick your state.' },
			{ from: 5.7, to: 13.3, headline: 'Your governor, senators and reps.', detail: 'By name, with party and photo.' },
		],
	},
	{
		clip: 'budget', log: budget, from: 1.4, to: 10.5, layout: 'portrait',
		camera: [
			{ t: 1.4, scale: 1, x: 2600, y: 1300 },
			{ t: 3.4, scale: 1, x: 2600, y: 1300 },
			{ t: 4.8, scale: 1.1, x: 2300, y: 1250 },
			{ t: 7.1, scale: 1.1, x: 2300, y: 1250 },
			{ t: 8.6, scale: 1.4, x: 590, y: 1280 },
			{ t: 10.5, scale: 1.4, x: 590, y: 1280 },
		],
		cues: [
			{ from: 3.1, to: 7.3, headline: '₦68 trillion budget.', detail: 'Follow where every naira goes.' },
			{ from: 7.7, to: 10.5, headline: 'Education: ₦2.56 trillion.', detail: 'About ₦10,600 for every Nigerian.' },
		],
	},
	{
		clip: 'election', log: election, from: 0.3, to: 5.3, layout: 'portrait',
		camera: [
			{ t: 0.3, scale: 1, x: 640, y: 900 },
			{ t: 1.9, scale: 1.55, x: 500, y: 690 },
			{ t: 5.3, scale: 1.6, x: 500, y: 690 },
		],
		cues: [{ from: 1.2, to: 5.3, headline: 'Elections: 16 January 2027.', detail: 'Know what each office does before you vote.' }],
	},
]

export const VERTICAL_FRAMES = Math.round((TITLE + END + VERTICAL.reduce((sum, shot) => sum + shot.to - shot.from, 0)) * FPS)

/** The vertical cut, with effects (`sound`) or silent, for a trending sound added in TikTok or Reels. */
export function FilmVertical({ sound = true }: { sound?: boolean }) {
	return (
		<Stage>
			{sound ? <Soundtrack hits={soundHits(VERTICAL, TITLE)} fps={FPS} total={VERTICAL_FRAMES} /> : null}
			<Series>
				<Series.Sequence durationInFrames={Math.round(TITLE * FPS)}>
					<TitleCard lines={['Who actually', 'runs', 'Nigeria?']} size={150} />
				</Series.Sequence>
				{VERTICAL.map(({ to, ...shot }) => (
					<Series.Sequence key={shot.clip} durationInFrames={Math.round((to - shot.from) * FPS)}>
						<Shot {...shot} />
					</Series.Sequence>
				))}
				<Series.Sequence durationInFrames={Math.round(END * FPS)}>
					<EndCard compact />
				</Series.Sequence>
			</Series>
		</Stage>
	)
}
