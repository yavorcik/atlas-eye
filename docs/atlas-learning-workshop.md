# Atlas Learning live build

Free 45-minute workshop for owner-led service businesses that already receive quote or appointment requests. Participants can bring a fictional or redacted inquiry.

## Operate the signup and inquiry flows

The Learn page collects permission-based workshop signups and consulting inquiries. The workshop list stays open while the date is pending. The forms show a confirmation only after storage succeeds. They do not send email.

In the Atlas Eye Netlify project, open **Blobs** and choose **learning-workshop-signups** or **learning-inquiry-review**. Each signup is deduplicated by email. Each inquiry has a timestamp, a source, its intake fields, a routing status and a draft for staff to review. Use the draft and the existing booking calendar to handle the inquiry. Download only the record you need, keep it private, and remove test records and stale personal data. Preview deploys use separate per-deploy stores.

When the host confirms the workshop date and time, create the host meeting and publish the time and time zone. Update the confirmation copy and share the joining instructions with the people who opted into that workshop. Keep the joining link out of the public repository. Use separate campaign tags for referrals, email and partner events.

## Run of show

| Time | What to do |
| --- | --- |
| 0–7 min | Tell the Valley Tote story. The site came together quickly. The small ad test produced clicks and no verified demand. Ask where an inquiry stalls in the audience’s business. |
| 7–17 min | Agree on the qualifying rules. Open the prompt in the draft runner and build the first rule together. |
| 17–30 min | Run a fictional roofing-owner inquiry. Show the draft, the optional booking link and the staff review decision. |
| 30–40 min | Run a vague inquiry and an attempt to override the workflow. Invite a fictional audience example. Review errors and missing information together. |
| 40–45 min | Offer a free inbox review. For a good fit, scope a paid setup around one inbox and one booking flow. |

## Rehearse the model-assisted review

With Ollama running locally, use an installed model. The script sends the selected text only to the Ollama endpoint on localhost. The record mode leaves the contact name and email out of the prompt.

```sh
ATLAS_INQUIRY_MODEL=qwen3.5:9b node scripts/atlas-inquiry-draft.mjs qualified
ATLAS_INQUIRY_MODEL=qwen3.5:9b node scripts/atlas-inquiry-draft.mjs vague
ATLAS_INQUIRY_MODEL=qwen3.5:9b node scripts/atlas-inquiry-draft.mjs review
ATLAS_INQUIRY_MODEL=qwen3.5:9b node scripts/atlas-inquiry-draft.mjs --record /path/to/private-record.json
```

Review the output for accuracy and promises before using it. The deployed queue uses fixed rules so it can prepare a draft without model credentials. Rehearse the local model before presenting it live. Use the interactive public demo as a fallback.

For the first client setup, compare median first-response time, qualified inquiries that book, and booked appointments that take place against a comparable baseline. Record the underlying counts and capture source attribution when known.
