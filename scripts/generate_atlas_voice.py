from pathlib import Path
import json
import os
import re
import subprocess
import sys

VOICE = os.environ.get("ATLAS_VOICE_ID")
KEY = os.environ.get("ELEVENLABS_API_KEY")

if not VOICE or not KEY:
    sys.exit("Missing ELEVENLABS_API_KEY or ATLAS_VOICE_ID")

story = Path("src/experience/story.js").read_text()

blocks = re.findall(r"narration:\s*\[([\s\S]*?)\]", story)
lines = []

for block in blocks:
    lines.extend(re.findall(r'"([^"]+)"', block))

if not lines:
    sys.exit("No narration lines found in src/experience/story.js")

out = Path("public/audio/atlas-experience")
out.mkdir(parents=True, exist_ok=True)

for i, text in enumerate(lines):
    filename = out / f"{i:03d}.mp3"

    body = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.72,
            "similarity_boost": 0.85,
            "style": 0.18,
            "use_speaker_boost": True
        }
    }

    print(f"{i:03d}  {text}")

    subprocess.run([
        "curl", "-sS", "-X", "POST",
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128",
        "-H", f"xi-api-key: {KEY}",
        "-H", "Content-Type: application/json",
        "-d", json.dumps(body),
        "-o", str(filename)
    ], check=True)

print(f"\nGenerated {len(lines)} Atlas narration files.")
