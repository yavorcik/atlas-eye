# Build an AI agent that turns inquiries into booked calls

Free 45-minute workshop for owner-led service businesses that already receive quote or appointment requests. Attendees can bring a fictional or redacted inquiry. No coding experience required.

## Host checklist

- Confirm the date and time. Create a group registration page with the event time zone and meeting instructions. Once it accepts signups, replace the date-pending text and switch the main Learn page button to **Save my seat for the free live build**.
- Start with personal invitations and a local business organization. Use the workshop link with a distinct campaign tag for each channel. Track registrations, attendance and qualified inbox reviews by channel where the registration system supports attribution.
- Rehearse with a local Ollama model and fictional inputs. Open the public scripted demo as a fallback. The inbox integration is a separate step once an isolated test inbox is selected. Use drafts and a manual review queue for the first installation.

## Run of show

| Time | What to do |
| --- | --- |
| 0–7 min | Tell the Valley Tote story. The site came together quickly. The small ad test produced clicks and no verified demand. Ask where an inquiry stalls in the audience’s business. |
| 7–17 min | Agree on the qualifying rules and define what staff should review. Show the workflow prompt and the fields it returns. |
| 17–30 min | Run the roofing-owner inquiry through the Atlas Learning draft runner. Show the draft, the optional booking link and the review decision. |
| 30–40 min | Run a vague inquiry and an attempt to override the workflow. Invite a fictional audience example. Review errors and missing information together. |
| 40–45 min | Offer a free inbox review. For a good fit, scope a paid setup around one inbox and one booking flow. |

## Run the draft workflow

With Ollama running on the same machine, set the environment variable to an installed model. For example, on an Atlas host that already has `qwen3.5:9b`:

```sh
ATLAS_INQUIRY_MODEL=qwen3.5:9b node scripts/atlas-inquiry-draft.mjs qualified
ATLAS_INQUIRY_MODEL=qwen3.5:9b node scripts/atlas-inquiry-draft.mjs vague
ATLAS_INQUIRY_MODEL=qwen3.5:9b node scripts/atlas-inquiry-draft.mjs review
printf '%s\n' 'I run a plumbing company and miss weekend requests.' |
  ATLAS_INQUIRY_MODEL=qwen3.5:9b node scripts/atlas-inquiry-draft.mjs -
```

The workflow produces a review packet locally. It has no mailbox permissions or send step. Review the model output for accuracy and promises before sending a reply manually. For the first client setup, compare median first-response time, qualified inquiries that book, and booked appointments that take place against a comparable baseline. Track volume alongside each rate.
