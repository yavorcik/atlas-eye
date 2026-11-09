# How I Made Moxie: A Transplant Companion

**Target:** 4–6 minutes  
**Demo rule:** Use fictional details only. Never show a MyChart screen, real lab result, medication list, or patient identifier.

## Before recording

- Start Ollama and Moxie; confirm the selected model is warm.
- Open the Moxie page and make the browser text large.
- Keep a screenshot of the fictional result ready in case the model stalls.
- Keep the terminal out of view until the Git and tech-stack explanation.

## 0:00 — The problem

“After a transplant, there’s a lot to keep straight: lab results, instructions, appointments, medications, and questions. I wanted to see whether an AI agent could help organize all of that. I’m a liver transplant patient, so this problem is personal to me. Today’s demo uses made-up information.”

## 0:35 — Design before code

“My first question wasn’t ‘Which model should I use?’ It was ‘What job should Moxie do?’ The answer: organize information and help a patient prepare for a conversation with their transplant team.”

“Then I wrote down what Moxie must not do. It must not diagnose, decide whether a lab result is safe, or tell anyone to change a medication. Those boundaries shape the prompt, the interface, and the examples.”

## 1:20 — Show the fictional example

Click **Lab timeline** and submit the sample.

“This is a fictional timeline. Moxie can put the values in date order, describe what information was supplied, and suggest questions. It should not call the trend good or bad or pretend to know what it means for this patient.”

Then click **Needs more context** and **Medication question**. Explain that Moxie should ask for missing information or direct medication questions back to the care team.

## 2:30 — Show how it was built

“Git keeps the project’s history. I saved the original Moxie demo as a starting commit, created a separate `moxie-transplant-demo` branch, and made these changes there. If I make a mistake, I can compare versions or go back.”

Show `git status --short --branch`, then point out the changed files. Do not stage or commit anything during the recording unless the change has been reviewed.

“Here’s the stack: the browser is the screen; Node is the small local server; Ollama runs the language model on this computer; Git tracks the code changes.”

## 3:25 — Explain RAG honestly

“Right now, Moxie follows instructions in its prompt and uses the fictional information typed into the page. It does not yet search a transplant knowledge base. The next step is RAG: retrieve a relevant passage from a small, reviewed set of patient-education sources, give that passage to Moxie, and show the source and date with the answer.”

“For a patient’s own care plan, the source would need to be their own dated instructions. A general article must never be presented as their personal medical target.”

## 4:20 — Explain MyChart and privacy

“This demo is not connected to MyChart. A future connection should use the patient-authorized app-access flow, if the health system supports it. Moxie should never ask a patient to give it a MyChart password.”

“Git tracks code, not private records or credentials. The public demo stays fictional. A private version would need separate, carefully controlled storage and clear patient control over access and deletion.”

## 5:00 — Close

“That’s how I made Moxie: start with a real problem, define the job and boundaries, build one small workflow, and improve it one saved change at a time. The point isn’t that AI replaces your judgment or your care team. It’s that you can learn the tools and build an assistant around a problem you understand.”

“Next, we’ll add a small, source-linked transplant education library and an optional medication reminder that the patient controls.”
