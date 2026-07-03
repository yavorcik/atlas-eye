from pathlib import Path
import json
import subprocess

audio_dir = Path("public/audio/atlas-experience")
files = sorted(audio_dir.glob("[0-9][0-9][0-9].mp3"))

if not files:
    raise SystemExit("No numbered MP3 files found.")

cues = []
cursor = 0.0

for index, path in enumerate(files):
    result = subprocess.check_output([
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(path),
    ], text=True).strip()

    duration = float(result)

    cues.append({
        "index": index,
        "start": round(cursor, 3),
        "end": round(cursor + duration, 3),
        "duration": round(duration, 3),
    })

    cursor += duration

out = Path("src/experience/audioCues.js")
out.write_text("export const audioCues = " + json.dumps(cues, indent=2) + "\n")

print(f"Wrote {len(cues)} cues to {out}")
print(f"Total duration: {cursor:.2f} seconds")
