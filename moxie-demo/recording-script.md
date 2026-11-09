# How I Made Moxie: A Transplant Companion

**Target:** 4–6 minutes  
**Recording mode:** Public demo only. Use fictional details throughout.

## Before recording

- Start the public demo with `env -u MOXIE_PRIVATE_PROFILE MOXIE_PORT=4175 ./moxie-demo/start.sh`.
- Open `http://127.0.0.1:4175` and confirm the page does not say **Private profile · local**.
- Warm the Quick model and use the fictional examples.
- Never show MyChart, private-profile output, real labs, medication lists, or patient identifiers.
- Keep the terminal hidden until the Git and tech-stack section.

## 0:00 — The problem

“After a transplant, there’s a lot to keep straight: lab results, instructions, appointments, medications, and questions. I wanted to see whether an AI assistant could help organize that information. I’m a liver transplant patient, so the problem is personal to me. The information in today’s demo is made up.”

## 0:35 — Design and guardrails

“Before choosing a model, I decided what Moxie should do: organize information and help a patient prepare for a conversation with their transplant team.”

“Moxie must not diagnose, interpret a result as safe or unsafe, or tell someone to change a medication. A missed-dose question goes through a fixed safety response that directs the patient to their own team. The model does not decide what dose to take.”

## 1:20 — Try the demo

Click **Lab timeline**, submit it, and explain that Moxie organizes the fictional dates and values without judging the trend.

Then click **Medication question** and submit it.

“Here Moxie routes the question to the transplant team. It doesn’t guess, ask the model to choose a dose, or treat general education as this patient’s instructions.”

## 2:30 — Show how it was built

“Git saves the project’s history. I started from the original Moxie demo, created a separate `moxie-transplant-demo` branch, and made the transplant changes there. I can review the differences before saving a new version.”

Show `git branch --show-current` and `git log -3 --oneline`. Avoid displaying private files or staging changes during the recording.

“The browser is the screen. Node runs the local server. Ollama runs the language model on this computer. Git tracks the code.”

## 3:25 — Explain retrieval

“For ordinary questions, this version uses simple keyword matching against a small set of reviewed source notes. It can show which sources matched. This is a first retrieval step, not a medical knowledge system: it uses no embeddings or vector database, and a public source is never a patient’s care plan.”

“The missed-dose path is handled separately with a fixed response. In private mode, Moxie can load a local patient-reported note. That mode is not part of this public recording.”

## 4:20 — Explain privacy and MyChart

“This demo runs locally and is not connected to MyChart. A future connection would need a patient-authorized access path supported by the health system. Moxie should never ask for a MyChart password.”

“The private care-plan note is kept out of Git. The public demo uses fictional details. Nothing here reads or monitors a real patient account.”

## 5:00 — Close

“That’s how I made Moxie: start with a problem you understand, define the job and its limits, build one small workflow, and improve it one saved change at a time. AI can help you build a tool around your own problem while people and care teams stay in charge.”

“Next, I’ll improve how Moxie finds and presents trustworthy educational sources, then explore patient-controlled reminders and the official MyChart access options.”
