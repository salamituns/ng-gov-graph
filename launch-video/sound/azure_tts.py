"""Narrates the launch film with Azure's Nigerian-English neural voices (en-NG Abeo or Ezinne).

    python3 sound/azure_tts.py <Abeo|Ezinne> <out.wav>

Reads AZURE_SPEECH_KEY and AZURE_SPEECH_REGION from launch-video/.env (git-ignored). The free F0 tier covers
500,000 characters a month; this script is about 900. A one-second pause between the seven lines lets
sound/voice.py find them, exactly as with a recorded take. Sends through curl, which uses the Mac's own certificate store (the python.org build often has none).
"""
import os
import subprocess
import sys
from xml.sax.saxutils import escape

sys.path.insert(0, os.path.dirname(__file__))
from yarn_tts import LINES  # noqa: E402  (the spoken script: numbers in words)

ROOT = os.path.join(os.path.dirname(__file__), '..')
env = dict(line.strip().split('=', 1) for line in open(os.path.join(ROOT, '.env')) if '=' in line)
voice, out = sys.argv[1], sys.argv[2]

# Calm and clear rather than salesy; a touch slower than default so each fact lands.
body = '<break time="1000ms"/>'.join(f'<s>{escape(line)}</s>' for line in LINES)
ssml = (
    '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-NG">'
    f'<voice name="en-NG-{voice}Neural"><prosody rate="-6%">{body}</prosody></voice></speak>'
)
# The key goes in through stdin (curl's -H @-), so it never appears in the process list.
subprocess.run(
    [
        'curl', '--fail-with-body', '-sS', '-o', out,
        '-H', '@-',
        '-H', 'Content-Type: application/ssml+xml',
        '-H', 'X-Microsoft-OutputFormat: riff-48khz-16bit-mono-pcm',
        '-H', 'User-Agent: whoruns9ja-launch-film',
        '--data-binary', ssml,
        f"https://{env['AZURE_SPEECH_REGION']}.tts.speech.microsoft.com/cognitiveservices/v1",
    ],
    input=f"Ocp-Apim-Subscription-Key: {env['AZURE_SPEECH_KEY']}\n",
    text=True,
    check=True,
)
print(f'{voice}: wrote {out}')
