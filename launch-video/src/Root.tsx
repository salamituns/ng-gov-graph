import { Composition } from 'remotion'
import { Scene, type SceneProps } from './Scene'
import opening from '../public/clips/opening.json'
import './theme'
import { Film, FILM_FRAMES, FilmVertical, VERTICAL_FRAMES, FPS as FILM_FPS } from './film/Film'
import { FilmVoice, calculateVoiceMetadata } from './film/FilmVoice'
import { MotionFilm, MOTION_FRAMES } from './motion/MotionFilm'

const FPS = 30

/** Scene 1–2: the hook over the first-visit pulse, then the President's lines fanning out. */
const OPENING: SceneProps = {
	clip: 'opening',
	taps: opening.taps as SceneProps['taps'],
	trim: 0.3,
	// Whole phone for the hook and the tap; once the sheet is pulled down, push in on the fan-out.
	camera: [
		{ t: 0, scale: 1, x: 540, y: 900 },
		{ t: 5.6, scale: 1, x: 540, y: 900 },
		{ t: 7.0, scale: 1.5, x: 540, y: 820 },
	],
	captions: [
		{ from: 0, to: 3.0, headline: 'Who actually runs Nigeria?' },
		{ from: 3.0, to: 9.6, headline: 'Tap any office.', detail: 'See who holds it, and who put them there.' },
	],
}

export function Root() {
	return (
		<>
			{/* Narrated cuts: timed from public/voice/voice.json (sound/voice.py); 60s is a placeholder until it loads. */}
			<Composition id="LaunchFilmVoice" component={FilmVoice} defaultProps={{ voice: null, layout: 'landscape' as const }} calculateMetadata={calculateVoiceMetadata} width={1920} height={1080} fps={FILM_FPS} durationInFrames={60 * FILM_FPS} />
			<Composition id="LaunchFilmVoiceVertical" component={FilmVoice} defaultProps={{ voice: null, layout: 'portrait' as const }} calculateMetadata={calculateVoiceMetadata} width={1080} height={1920} fps={FILM_FPS} durationInFrames={60 * FILM_FPS} />
			{/* The Impractical storyboard (impractical/draft) rebuilt here: the live wheel as the set. */}
			<Composition id="LaunchFilmMotion" component={MotionFilm} defaultProps={{ music: true }} width={1920} height={1080} fps={FILM_FPS} durationInFrames={MOTION_FRAMES} />
			<Composition id="LaunchFilm" component={Film} width={1920} height={1080} fps={FILM_FPS} durationInFrames={FILM_FRAMES} />
			<Composition id="LaunchFilmVertical" component={FilmVertical} defaultProps={{ sound: true }} width={1080} height={1920} fps={FILM_FPS} durationInFrames={VERTICAL_FRAMES} />
			<Composition id="LaunchFilmVerticalSilent" component={FilmVertical} defaultProps={{ sound: false }} width={1080} height={1920} fps={FILM_FPS} durationInFrames={VERTICAL_FRAMES} />
			<Composition id="PreviewOpening" component={Scene} defaultProps={OPENING} width={1080} height={1920} fps={FPS} durationInFrames={Math.round(9.6 * FPS)} />
		</>
	)
}
