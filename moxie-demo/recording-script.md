# Moxie screen-recording script

Target: 4–6 minutes. Use a fictional roofing inquiry. Keep browser text and terminal text large. Select **Quick · qwen3:4b** for the live run when installed; choose **Detailed · qwen3.5:9b** when answer quality matters more than speed. Warm the selected model before recording so the first answer does not wait for a cold load.

## Storyboard and narration

### 1. The result (0:00–0:25)

Show Moxie in the browser. Click **Roofing quote** and say: “This is Moxie. It reads one sample inquiry, figures out whether it has enough information, and prepares a draft. It does not send anything.” Point out the speed selector briefly; use the quick model for the first response.

### 2. The stack (0:25–1:05)

Click **Show me the tech**. Point to the map: “ChatGPT helps us design the job. Codex changes the files. Node is the small server between the browser and the model. Ollama runs the model on this computer. GitHub and hosting come later, when we want to publish.”

Clarify: “Local model means this inference runs here; it does not mean ChatGPT or Codex are local.”

### 3. The instruction (1:05–1:40)

Briefly show the `instructions` and output `schema` in `server.mjs`. Say: “The prompt defines the job and guardrails. The schema makes the output predictable enough for the interface to display.”

### 4. The live run (1:40–2:25)

Return to the browser, click the roofing example, and run Moxie. While it thinks: “The browser sends the text to our Node server. The server sends it to Ollama on this machine. Ollama returns a structured answer. We do not save it.”

Review the status, summary, question, draft and next step. Say: “This is a first pass, not a decision. A person reviews it.”

### 5. Try a tricky case (2:25–3:10)

Click **Needs a human**, run it, and show that the prompt cannot override Moxie’s job. Then run **Vague request** to show it asks for clarification instead of making up details.

### 6. The code path (3:10–4:10)

Show the terminal with the server running, then the three files: `public/index.html` (interface), `public/app.js` (browser behavior), and `server.mjs` (local model call and validation). Say: “That’s the stack. Each piece has one job. We can change the model without rebuilding the whole workflow.”

### 7. Close (4:10–4:30)

Return to the browser and say: “Bring one task you’re tired of doing. We’ll show you how to turn it into an agent—and how to build the next one yourself. Liberation via AI Agent.”

## Recording checklist

- Use sample data only; no real names, inboxes, client files or personal information.
- Keep `server.mjs` and browser screens free of API keys and private paths.
- Do not show attendee registrations or the private meeting link.
- Confirm the status pill says **Local model connected** before capture.
- Capture a clean run at 1920×1080; leave enough time for the model to answer naturally.
- If Ollama is unavailable or the model response is malformed, stop the recording and fix it. Do not pass off a canned answer as a live model run.
