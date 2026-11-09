#!/usr/bin/env bash
set -euo pipefail

model="${MOXIE_MODEL:-qwen3.5:9b}"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama is not installed or is not on PATH." >&2
  exit 1
fi

if ! curl --fail --silent --show-error --max-time 3 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  echo "Ollama is not running. Start it in another terminal, then rerun this script." >&2
  exit 1
fi

if ! ollama list | rg --fixed-strings --quiet "$model"; then
  echo "Model $model is not installed. Run: ollama pull $model" >&2
  exit 1
fi

echo "Starting Moxie with local model: $model"
echo "Open http://127.0.0.1:${MOXIE_PORT:-4174}"
exec env MOXIE_MODEL="$model" node "$(dirname "$0")/server.mjs"
