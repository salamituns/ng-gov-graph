#!/usr/bin/env bash
# Masters the rendered films' sound for social platforms (run after `remotion render`).
#   16:9 (music + effects): two-pass loudness normalisation to -14 LUFS, true peak -1.5 dB, balance unchanged.
#   9:16 with effects: peak-normalised to -1.5 dB (sparse effects would turn harsh at -14 LUFS),
#   then the 720p WhatsApp copy is made from it.
set -euo pipefail
cd "$(dirname "$0")/../out"

# Two-pass loudnorm to -14 LUFS for a 16:9 cut (music + effects), video untouched.
loud() {
	local stats measured
	stats=$(ffmpeg -nostats -v info -i "$1" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -vn -f null - 2>&1 | sed -n '/^{/,/^}/p')
	measured=$(echo "$stats" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
	ffmpeg -y -loglevel error -i "$1" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11:$measured:linear=true" -ar 48000 -c:a aac -b:a 192k -movflags +faststart tmp.mp4 && mv tmp.mp4 "$1"
}

wide=whoruns9ja-launch-16x9.mp4
loud "$wide"
# The motion cut (LaunchFilmMotion), when it has been rendered.
motion=whoruns9ja-launch-motion-16x9.mp4
if [ -f "$motion" ]; then loud "$motion"; fi

tall=whoruns9ja-launch-9x16-sfx.mp4
peak=$(ffmpeg -nostats -v info -i "$tall" -af volumedetect -vn -f null - 2>&1 | grep -oE "max_volume: [-0-9.]+" | awk '{print $2}')
gain=$(python3 -c "print(round(-1.5 - ($peak), 2))")
ffmpeg -y -loglevel error -i "$tall" -c:v copy -af "volume=${gain}dB" -c:a aac -b:a 192k -movflags +faststart tmp.mp4 && mv tmp.mp4 "$tall"
ffmpeg -y -loglevel error -i "$tall" -vf scale=720:1280:flags=lanczos -c:v libx264 -preset slow -crf 26 -c:a aac -b:a 128k -movflags +faststart whoruns9ja-launch-9x16-whatsapp.mp4
echo "mastered: $wide (-14 LUFS), $tall (+${gain} dB), whatsapp copy"
