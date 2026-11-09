const samples = {
  qualified: {
    message: '“Water is coming in around a vent. We’re in Boardman, Ohio. Can someone come take a look next week?”',
    status: 'Qualified',
    found: 'Roof leak in Boardman, an area the sample business serves. The customer requested an inspection next week.',
    next: 'Offer a scheduling link after staff review. Leave the visit and price open.',
    draftLabel: 'Customer reply draft',
    draft: 'Thanks for reaching out about the leak near your vent. If you’d like to talk through the inspection, you can choose a time for a short call here: [booking link]. We can discuss the next available visit on the call.',
  },
  clarify: {
    message: '“How much would it cost to fix my roof?”',
    status: 'Needs details',
    found: 'The customer asked for a price. The location and type of repair are missing.',
    next: 'Ask for the city and a short description before quoting or offering a booking.',
    draftLabel: 'Customer reply draft',
    draft: 'Thanks for reaching out. What city is the property in, and what issue are you seeing with the roof? That will help us work out the right next step.',
  },
  review: {
    message: '“A few shingles came off our roof. We’re in Columbus, Ohio. Do you come out here?”',
    status: 'Owner review',
    found: 'Shingle repair in Columbus, outside the sample company’s service area.',
    next: 'Route to the owner for a coverage decision. Hold the booking link.',
    draftLabel: 'Internal note draft',
    draft: 'The customer asked whether we serve Columbus. Review coverage before promising a visit or sharing a booking link.',
  },
}

const form = document.getElementById('sample-form')
const sample = document.getElementById('sample')
const result = document.getElementById('sample-result')
const announcement = document.getElementById('sample-announcement')
const videoDialog = document.getElementById('agent-video-dialog')
const videoPlayer = document.getElementById('agent-video-player')

document.querySelectorAll('.agent-video-preview').forEach((preview) => {
  preview.addEventListener('click', () => {
    videoPlayer.src = preview.dataset.videoSrc
    videoPlayer.poster = preview.dataset.videoPoster
    videoDialog.showModal()
    videoPlayer.play().catch(() => {})
  })
})

document.querySelector('.agent-video-close').addEventListener('click', () => {
  videoDialog.close()
})

videoDialog.addEventListener('click', (event) => {
  if (event.target === videoDialog) videoDialog.close()
})

videoDialog.addEventListener('close', () => {
  videoPlayer.pause()
  videoPlayer.removeAttribute('src')
  videoPlayer.load()
})


sample.addEventListener('change', () => {
  document.getElementById('sample-message').textContent = samples[sample.value].message
  result.hidden = true
  announcement.textContent = ''
})

form.addEventListener('submit', (event) => {
  event.preventDefault()
  const selected = samples[sample.value]
  document.getElementById('sample-status').textContent = selected.status
  document.getElementById('sample-found').textContent = selected.found
  document.getElementById('sample-next').textContent = selected.next
  document.getElementById('sample-draft-label').textContent = selected.draftLabel
  document.getElementById('sample-draft').textContent = selected.draft
  result.hidden = false
  announcement.textContent = `${selected.status}. ${selected.draftLabel} ready to review.`
})
