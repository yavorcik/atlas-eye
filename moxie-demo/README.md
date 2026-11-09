# Moxie local demo

Moxie is a local Atlas Learning demo of a transplant recovery organizer. It uses fictional information to arrange a lab timeline and prepare questions for a transplant team. It does not diagnose, recommend treatment changes, connect to MyChart, or store submitted text.

## Start it

Requirements: Node.js 20+ and Ollama running locally with `qwen3.5:9b` installed. If available, `qwen3:4b` appears as the faster live-demo option.

```sh
ollama serve
ollama pull qwen3.5:9b
ollama pull qwen3:4b
./moxie-demo/start.sh
```

If the Ollama service is already running, skip `ollama serve`. Moxie selects `qwen3:4b` for speed when installed and keeps `qwen3.5:9b` available for more detailed answers. To change either configured model, set `MOXIE_FAST_MODEL` or `MOXIE_MODEL` before starting.

Open <http://127.0.0.1:4174>. The server binds to loopback and calls only Ollama on this computer. To use another installed model, set `MOXIE_MODEL` when starting the server. Do not expose the Ollama port to the public internet.

## What the pieces do

- **ChatGPT** helps turn the workflow into a clear specification.
- **Codex** edits the source files in the terminal.
- **Browser** is Moxie's user interface.
- **Node.js** serves the interface, validates the request, and calls the local model.
- **Ollama** runs the model at `127.0.0.1:11434`.
- **GitHub and hosting** are later steps to save and publish a reviewed version.

The browser never calls Ollama directly. The local Node server proxies the request, enforces size limits, and validates the structured answer. Inference runs through the local Ollama service. ChatGPT and Codex are separate tools and may use cloud services.

## Rehearsal boundaries

Use fictional information only. This prototype has no MyChart or medical-record connection. Do not enter real health information. Submitted text is not saved to disk.

The chosen model stays loaded for 15 minutes between requests, which avoids repeated reload delays during a demo. Quick mode disables Qwen3's extra reasoning for this short structured task and allows enough output tokens to finish its JSON. Smaller models generally trade some answer depth for response speed; compare both on the actual machine before presenting.

See [`recording-script.md`](./recording-script.md) for the screen-recording walkthrough.

## Local source retrieval (RAG)

The demo keeps short, reviewed source summaries in `knowledge/sources.json`. For each question, the Node server scores source text against the question's words, passes up to two matching summaries to Ollama, and returns their titles, links, and scope for display. If nothing matches, Moxie is told to say that no external source matched.

This is intentionally simple keyword retrieval for teaching. It does not use embeddings, a vector database, MyChart, or patient records. The sources are general education, not an individual care plan. Use fictional details in the public demo.
