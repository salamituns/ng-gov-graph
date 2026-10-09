import { Sequence, Series, getStaticFiles, interpolate, staticFile, type CalculateMetadataFunction } from 'remotion'
import { Audio } from '@remotion/media'
import { Stage } from './Stage'
import { Shot, type CameraKey, type Cue, type Layout, type ShotLog } from './Shot'
import { EndCard, TitleCard } from './Cards'
import mapvo from '../../public/clips/mapvo.json'
import news from '../../public/clips/news.json'
import represent from '../../public/clips/represent.json'
import election from '../../public/clips/election.json'

/**
 * The narrated cut. Its timing comes from the voice: public/voice/voice.json (made by sound/voice.py) gives
 * where each of the script's seven lines starts and ends, and every scene is placed around its line, with
 * the key action on the words that describe it. A new recording re-times the whole film by itself.
 */
export type Voice = { duration: number; lines: Array<{ start: number; end: number }> }
export type FilmVoiceProps = { voice: Voice | null; layout: Layout }

const FPS = 30
/** The voice comes in just after the title card appears. */
const DELAY = 0.5
/** Each scene starts a moment before its line, so the picture leads the words. */
const LEAD = 0.35
const TAIL = 1.9
const MUSIC = { file: 'Music/jonasblakewood-afro-house-afro-house-music-567328.mp3', level: 0.06 }

type Plan = {
	clip: string
	log: ShotLog
	duration: number
	/** Lines (0-based) the scene carries. */
	lines: number[]
	/** Line the anchor belongs to, how far into it (seconds), and the clip moment that should land there. */
	anchor: { line: number; into: number | ((length: number) => number); clipT: number }
	camera: Record<Layout, CameraKey[]>
	cues: Array<{ line: number; headline: string; detail?: string }>
}

const PLANS: Plan[] = [
	{
		clip: 'mapvo', log: mapvo as ShotLog, duration: mapvo.duration, lines: [1],
		// The President click lands a little before the middle of "…Click any one to see who holds it…".
		anchor: { line: 1, into: (length) => length * 0.45, clipT: 6.07 },
		camera: {
			landscape: [
				{ t: 0, scale: 1, x: 1600, y: 900 }, { t: 1.8, scale: 1, x: 1600, y: 900 }, { t: 3.4, scale: 1.4, x: 2240, y: 900 },
				{ t: 6.2, scale: 1.4, x: 2240, y: 900 }, { t: 7.8, scale: 1, x: 1600, y: 900 }, { t: 13.6, scale: 1.04, x: 1600, y: 860 },
			],
			portrait: [
				{ t: 0, scale: 1, x: 2240, y: 900 }, { t: 3.4, scale: 1.2, x: 2240, y: 900 }, { t: 6.2, scale: 1.2, x: 2240, y: 900 },
				{ t: 7.0, scale: 1.05, x: 2240, y: 900 }, { t: 8.8, scale: 1.05, x: 2240, y: 900 }, { t: 9.8, scale: 1.25, x: 600, y: 420 }, { t: 13.6, scale: 1.25, x: 600, y: 420 },
			],
		},
		cues: [{ line: 1, headline: 'Every office. Who holds it.', detail: 'Who put them there, and the law behind it.' }],
	},
	{
		clip: 'news', log: news as ShotLog, duration: news.duration, lines: [2, 3],
		// The ministry opens as "Then follow the money" begins.
		anchor: { line: 3, into: -0.2, clipT: 7.65 },
		camera: {
			landscape: [
				{ t: 0, scale: 1, x: 1600, y: 900 }, { t: 1.3, scale: 1.7, x: 520, y: 200 }, { t: 3.2, scale: 1.7, x: 520, y: 200 },
				{ t: 4.3, scale: 1.3, x: 700, y: 360 }, { t: 5.6, scale: 1, x: 1600, y: 900 }, { t: 9.9, scale: 1, x: 1600, y: 900 },
				// The budget card sits near the top once scrolled (₦2.56 trillion at ~y 400): frame it tight, so the
				// news stories (and their photos) below it stay out of shot.
				{ t: 11.6, scale: 1.9, x: 700, y: 470 }, { t: 18.7, scale: 1.95, x: 700, y: 470 },
			],
			portrait: [
				{ t: 0, scale: 1, x: 640, y: 900 }, { t: 1.3, scale: 1.5, x: 520, y: 220 }, { t: 3.2, scale: 1.5, x: 520, y: 220 },
				{ t: 4.3, scale: 1.25, x: 600, y: 380 }, { t: 6.0, scale: 1, x: 2240, y: 900 }, { t: 7.4, scale: 1, x: 2240, y: 900 },
				{ t: 8.4, scale: 1.15, x: 600, y: 420 }, { t: 9.9, scale: 1.15, x: 600, y: 420 }, { t: 11.6, scale: 1.9, x: 430, y: 470 }, { t: 18.7, scale: 1.95, x: 430, y: 470 },
			],
		},
		cues: [
			{ line: 2, headline: 'Most covered this week.', detail: 'And which office is responsible.' },
			{ line: 3, headline: 'Education: ₦2.56 trillion.', detail: 'About ₦10,600 for every Nigerian.' },
		],
	},
	{
		clip: 'represent', log: represent as ShotLog, duration: represent.duration, lines: [4],
		// The state is picked as "Pick your state" is said.
		anchor: { line: 4, into: 0.9, clipT: 2.44 },
		camera: {
			landscape: [
				{ t: 1.4, scale: 1.35, x: 640, y: 1080 }, { t: 2.7, scale: 1.35, x: 640, y: 1080 }, { t: 3.8, scale: 1, x: 1600, y: 900 },
				{ t: 5.6, scale: 1, x: 1600, y: 900 }, { t: 7.0, scale: 1.3, x: 640, y: 950 }, { t: 13.3, scale: 1.3, x: 640, y: 1000 },
			],
			portrait: [
				{ t: 1.4, scale: 1.2, x: 640, y: 1080 }, { t: 2.8, scale: 1.2, x: 640, y: 1080 }, { t: 3.8, scale: 1, x: 2240, y: 900 },
				{ t: 5.6, scale: 1, x: 2240, y: 900 }, { t: 6.8, scale: 1.12, x: 640, y: 950 }, { t: 13.3, scale: 1.12, x: 640, y: 1000 },
			],
		},
		cues: [{ line: 4, headline: 'Who represents you?', detail: 'Your governor, senators and reps. By name.' }],
	},
	{
		clip: 'election', log: election as ShotLog, duration: election.duration, lines: [5],
		anchor: { line: 5, into: 0, clipT: 0.6 },
		camera: {
			landscape: [{ t: 0.3, scale: 1, x: 1600, y: 900 }, { t: 1.9, scale: 1.9, x: 620, y: 690 }, { t: 9.2, scale: 2, x: 620, y: 690 }],
			portrait: [{ t: 0.3, scale: 1, x: 640, y: 900 }, { t: 1.9, scale: 1.55, x: 500, y: 690 }, { t: 9.2, scale: 1.62, x: 500, y: 690 }],
		},
		cues: [{ line: 5, headline: 'Elections: 16 January 2027.', detail: 'Know what each office does before you vote.' }],
	},
]

type Placed = { plan: Plan; start: number; length: number; from: number; cues: Cue[] }

/** Lays the scenes out on the voice's lines: where each starts, how long it runs, and where its clip begins. */
export function layout(voice: Voice) {
	const at = (line: number) => DELAY + voice.lines[line].start
	const end = (line: number) => DELAY + voice.lines[line].end
	const sceneStart = (line: number) => (line === 0 ? 0 : at(line) - LEAD)
	const placed: Placed[] = PLANS.map((plan) => {
		const start = sceneStart(plan.lines[0])
		const last = plan.lines[plan.lines.length - 1]
		const length = sceneStart(last + 1) - start
		const span = voice.lines[plan.anchor.line].end - voice.lines[plan.anchor.line].start
		const into = typeof plan.anchor.into === 'function' ? plan.anchor.into(span) : plan.anchor.into
		const wanted = plan.anchor.clipT - (at(plan.anchor.line) + into - start)
		// Stay inside the recording: never before its start, never past its end.
		const from = Math.max(0, Math.min(plan.duration - length, wanted))
		const cues = plan.cues.map((cue) => ({
			headline: cue.headline,
			detail: cue.detail,
			from: from + Math.max(0, at(cue.line) - start - 0.1),
			to: from + Math.min(length, (cue.line < last ? sceneStart(cue.line + 1) : start + length) - start),
		}))
		return { plan, start, length, from, cues }
	})
	const title = sceneStart(1)
	const endCard = { start: sceneStart(6), length: end(6) + TAIL - sceneStart(6) }
	return { placed, title, endCard, total: endCard.start + endCard.length }
}

export const calculateVoiceMetadata: CalculateMetadataFunction<FilmVoiceProps> = async ({ props }) => {
	const voice: Voice = await fetch(staticFile('voice/voice.json')).then((response) => response.json())
	return { durationInFrames: Math.ceil(layout(voice).total * FPS), props: { ...props, voice } }
}

export function FilmVoice({ voice, layout: frame }: FilmVoiceProps) {
	if (!voice) return <Stage />
	const { placed, title, endCard, total } = layout(voice)
	const hasMusic = getStaticFiles().some((file) => file.name === MUSIC.file)
	const totalFrames = Math.round(total * FPS)
	return (
		<Stage>
			<Series>
				<Series.Sequence durationInFrames={Math.round(title * FPS)}>
					<TitleCard lines={frame === 'portrait' ? ['Who actually', 'runs', 'Nigeria?'] : ['Who actually', 'runs Nigeria?']} size={frame === 'portrait' ? 150 : 132} />
				</Series.Sequence>
				{placed.map(({ plan, length, from, cues }) => (
					<Series.Sequence key={plan.clip} durationInFrames={Math.round(length * FPS)}>
						<Shot clip={plan.clip} log={plan.log} from={from} camera={plan.camera[frame]} cues={cues} layout={frame} />
					</Series.Sequence>
				))}
				<Series.Sequence durationInFrames={Math.round(endCard.length * FPS)}>
					<EndCard compact={frame === 'portrait'} />
				</Series.Sequence>
			</Series>

			<Sequence from={Math.round(DELAY * FPS)} layout="none">
				<Audio src={staticFile('voice/voice.wav')} />
			</Sequence>
			{/* Effects, quieter than in the music cut so they sit under the voice. */}
			<Sequence from={0} layout="none"><Audio src={staticFile('sfx/rise.wav')} volume={0.32} /></Sequence>
			{placed.flatMap(({ plan, start, length, from }) => [
				<Sequence key={`w-${plan.clip}`} from={Math.max(0, Math.round((start - 0.25) * FPS))} layout="none"><Audio src={staticFile('sfx/whoosh.wav')} volume={0.2} /></Sequence>,
				...plan.log.clicks
					.filter((click, index, all) => (index === 0 || click.t - all[index - 1].t > 0.15) && click.t >= from && click.t <= from + length)
					.map((click) => (
						<Sequence key={`c-${plan.clip}-${click.t}`} from={Math.round((start + click.t - from) * FPS)} layout="none"><Audio src={staticFile('sfx/click.wav')} volume={0.32} /></Sequence>
					)),
			])}
			<Sequence from={Math.round((endCard.start - 0.2) * FPS)} layout="none"><Audio src={staticFile('sfx/whoosh.wav')} volume={0.2} /></Sequence>
			<Sequence from={Math.round((endCard.start + 0.5) * FPS)} layout="none"><Audio src={staticFile('sfx/resolve.wav')} volume={0.3} /></Sequence>
			{hasMusic ? (
				<Audio
					src={staticFile(MUSIC.file)}
					// Well under the voice the whole way: a bed, not a song.
					volume={(f) => MUSIC.level * interpolate(f, [0, 2 * FPS, totalFrames - 3 * FPS, totalFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
				/>
			) : null}
		</Stage>
	)
}
