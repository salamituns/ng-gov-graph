# Launch film voiceover: script and recording guide

About 140 words, roughly 60 seconds at a calm, confident pace. Read it like you're telling a friend about something useful, not like an advert.

## Script

Leave a **full breath (about one second) between numbered lines**: the film uses those pauses to cut between scenes.

1. Who actually runs Nigeria?

2. Who Runs Naija maps every office in the federal government. Click any one to see who holds it, who put them there, and the part of the Constitution that gives it power.

3. See what Nigerians are talking about this week, and which office is responsible for it.

4. Then follow the money. Education gets two point five six trillion naira this year: about ten thousand six hundred naira for every Nigerian.

5. Pick your state to meet your governor, your senators and your representatives, by name.

6. The next general election is on the sixteenth of January, 2027. Know what each office does before you vote.

7. Free, sourced, and in English, Pidgin, Hausa, Yorùbá and Igbo. Who runs your state? Find out at who runs nine ja dot com.

## How to record (a phone is fine)

- **Room:** a small room with soft things (a bedroom with curtains, or a wardrobe full of clothes) beats a big empty room. Turn off fans and AC; close windows.
- **Phone:** iPhone Voice Memos, or any recorder app on Android. Hold it about a hand's width (15–20 cm) from your mouth, slightly to the side so your breath doesn't hit it. Airplane mode, so nothing rings.
- **Takes:** record the whole script in one go, two or three times. Small slips are fine: pause, and say the line again from its start. I'll pick the best take of each line.
- **Send:** the original file (for example the .m4a from Voice Memos) without trimming or "enhancing" it; I'll clean it up.
- **Where:** drop it in `launch-video/public/voice/` (any file name), or share it however is easiest.

## Notes

- Say the address as "who runs nine ja dot com" (it's what the screen shows at that moment).
- Numbers are written as you'd say them, so nobody has to translate "₦2.56T" on the fly.

## After recording (for whoever renders)

1. `python3 sound/voice.py path/to/recording.m4a` cleans the take (hum, hiss, room noise, level, -16 LUFS) and finds the seven lines from the pauses. It prints each line's start and end; if it doesn't find exactly seven, pick the lines by hand in `public/voice/voice.json`.
2. `npx remotion render LaunchFilmVoice out/whoruns9ja-launch-voice-16x9.mp4` and `npx remotion render LaunchFilmVoiceVertical out/whoruns9ja-launch-voice-9x16.mp4`. Every scene is timed from the voice, so a new take re-times the film by itself.
3. `out/preview-voice-guide-16x9.mp4` is a timing preview read by the Mac's built-in voice: not for posting.
