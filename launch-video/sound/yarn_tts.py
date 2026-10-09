"""Narrates the launch film with YarnGPT2, an Apache-2.0 Nigerian-accented English voice model, run locally.

    YARN=<dir with the yarngpt repo and WavTokenizer files> python sound/yarn_tts.py <voice> [line numbers...] [--out DIR]

Each scripted line is generated on its own (a glitch costs one line, not the take) and saved as line-N.wav
in --out. `assemble` then joins chosen takes with a fixed breath between lines into one recording that
sound/voice.py prepares like any other. Needs: torch, torchaudio, transformers<4.50, outetts, uroman, inflect, soundfile.
"""
import os
import sys

# The script as it should be *spoken*: numbers in words, no symbols, no diacritics the model hasn't seen.
LINES = [
    'Who actually runs Nigeria?',
    'Who Runs Naija maps every office in the federal government. Click any one to see who holds it, who put them there, and the part of the Constitution that gives it power.',
    'See what Nigerians are talking about this week, and which office is responsible for it.',
    'Then follow the money. Education gets two point five six trillion naira this year: about ten thousand six hundred naira for every Nigerian.',
    'Pick your state to meet your governor, your senators and your representatives, by name.',
    'The next general election is on the sixteenth of January, twenty twenty-seven. Know what each office does before you vote.',
    'Free, sourced, and in English, Pidgin, Hausa, Yoruba and Igbo. Who runs your state? Find out at who runs nine ja dot com.',
]

# How the model is fed: one short sentence at a time. YarnGPT drops words and garbles numbers in long lines
# (its author's own news reader splits sentences too); the parts of a line are joined back with a breath.
PARTS = [
    ['Who actually runs Nigeria?'],
    ['Who Runs Naija maps every office in the federal government.', 'Click any one, to see who holds it, and who put them there.', 'And the part of the Constitution that gives it power.'],
    ['See what Nigerians are talking about this week.', 'And which office is responsible for it.'],
    ['Then, follow the money.', 'Education gets two point five six trillion naira this year.', "That's about ten thousand, six hundred naira, for every Nigerian."],
    ['Pick your state, to meet your governor, your senators, and your representatives.', 'By name.'],
    ['The next general election is on January the sixteenth.', 'Twenty twenty-seven.', 'Know what each office does, before you vote.'],
    ['Free. Sourced.', 'And in English, Pidgin, Hausa, Yoruba and Igbo.', 'Who runs your state?', 'Find out, at who runs nine ja dot com.'],
]


def load():
    yarn = os.environ['YARN']
    sys.path.insert(0, yarn)  # the yarngpt repo is itself the package
    import torch
    from transformers import AutoModelForCausalLM
    from yarngpt.audiotokenizer import AudioTokenizerV2

    tokenizer = AudioTokenizerV2('saheedniyi/YarnGPT2', os.path.join(yarn, 'wavtokenizer_large_speech_320_24k.ckpt'), os.path.join(yarn, 'wavtok.yaml'))
    model = AutoModelForCausalLM.from_pretrained('saheedniyi/YarnGPT2', torch_dtype='auto').to(tokenizer.device)
    return torch, tokenizer, model


def speak(torch, tokenizer, model, text, voice, seed, temperature=0.1):
    torch.manual_seed(seed)
    prompt = tokenizer.create_prompt(text, lang='english', speaker_name=voice)
    ids = tokenizer.tokenize_prompt(prompt)
    out = model.generate(input_ids=ids, temperature=temperature, repetition_penalty=1.1, max_length=4000, do_sample=True)
    return tokenizer.get_audio(tokenizer.get_codes(out))


def main():
    args = sys.argv[1:]
    out = 'out-voice'
    if '--out' in args:
        i = args.index('--out')
        out = args[i + 1]
        del args[i:i + 2]
    seed = 7
    if '--seed' in args:
        i = args.index('--seed')
        seed = int(args[i + 1])
        del args[i:i + 2]
    takes = 1
    if '--takes' in args:
        i = args.index('--takes')
        takes = int(args[i + 1])
        del args[i:i + 2]
    voice, picks = args[0], [int(n) for n in args[1:]] or list(range(1, len(LINES) + 1))
    os.makedirs(out, exist_ok=True)
    torch, tokenizer, model = load()
    import soundfile
    for n in picks:
        for p, text in enumerate(PARTS[n - 1], 1):
            for take in range(1, takes + 1):
                # Takes differ in seed and a little in temperature, so a stumble in one is unlikely to repeat.
                audio = speak(torch, tokenizer, model, text, voice, seed + take, temperature=(0.1, 0.2, 0.3, 0.15)[(take - 1) % 4])
                path = os.path.join(out, f'line-{n}-{p}-take-{take}.wav')
                # soundfile, not torchaudio.save: recent torchaudio needs torchcodec just to write a wav.
                soundfile.write(path, audio.squeeze().float().cpu().numpy(), 24000)
                print(f'{voice} line {n}.{p} take {take}: {audio.shape[-1] / 24000:.1f}s', flush=True)


if __name__ == '__main__':
    main()
