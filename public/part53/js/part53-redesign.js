(() => {
  "use strict";

  const workspace = document.querySelector("#workspace");
  const progress = document.querySelector("#progress");
  const drawer = document.querySelector("#drawer");
  if (!workspace || !progress || !drawer) return;

  const STORAGE_KEY = "atlas-part53-application-state-v1";
  const STATES = {
    NOT_STARTED: "NOT_STARTED",
    IN_PROGRESS: "IN_PROGRESS",
    INTAKE_COMPLETE: "INTAKE_COMPLETE",
    REVIEW_REQUIRED: "REVIEW_REQUIRED"
  };
  const fields = [
    ["legal-name", "10 CFR § 53.1109(a)", "What is the exact legal name of the organization applying for the license?", "Applicant Identity"],
    ["address", "10 CFR § 53.1109(b)", "What is the applicant’s address?", "Applicant Identity"],
    ["business", "10 CFR § 53.1109(c)", "What business or occupation does the applicant conduct?", "Applicant Identity"],
    ["organization", "10 CFR § 53.1109(d)(3)(i)", "What is the applicant’s organization type, State of organization, and principal place of business?", "Organization and Control"],
    ["citizenship", "10 CFR § 53.1109(d)(3)(ii)", "Who are the applicant’s directors and principal officers?", "Organization and Control"],
    ["focd", "10 CFR § 53.1109(d)(3)(iii)", "Is the applicant owned, controlled, or dominated by an alien, foreign corporation, or foreign government?", "Organization and Control"],
    ["license", "10 CFR § 53.1109(e)", "What license, facility use, license period, and related approvals are being requested?", "Licensing Request"],
    ["financial", "10 CFR § 53.1413", "How will the applicant demonstrate financial qualifications?", "Supporting Qualifications"],
    ["safety", "10 CFR § 53.1416", "What safety analysis will support the application?", "Technical Basis"],
    ["environment", "10 CFR § 53.1419", "What environmental information will support the application?", "Environmental Basis"],
    ["eligibility", "10 CFR § 53.1118", "What legal eligibility review is required?", "Review Controls"],
    ["evidence", "Atlas controlled-record contract", "Which controlled records support this application?", "Evidence Controls"],
    ["reviews", "Atlas review-control contract", "What reviews and open items remain?", "Review Controls"],
    ["history", "Atlas traceability contract", "What application history must remain traceable?", "Traceability"]
  ];
  const nowIso = () => new Date().toISOString();
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const normalize = (value) => String(value ?? "").trim();
  const defaultState = () => ({
    schemaVersion: 1,
    interviewState: STATES.NOT_STARTED,
    readinessState: STATES.REVIEW_REQUIRED,
    field: 0,
    view: "question",
    answers: {},
    revisionSequence: 0,
    applicationRevision: "",
    completedAt: "",
    lastSavedAt: "",
    pendingWrite: false,
    returnToSummary: false,
    drawer: ""
  });
  const loadState = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (parsed?.schemaVersion === 1 && parsed.answers) return {...defaultState(), ...parsed, pendingWrite: false};
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    return defaultState();
  };
  const state = loadState();

  const current = () => fields[Math.max(0, Math.min(state.field, fields.length - 1))];
  const currentId = () => current()[0];
  const answeredRecords = () => fields.map(([id]) => state.answers[id]).filter((answer) => answer?.complete);
  const allRequiredAnswered = () => fields.every(([id]) => state.answers[id]?.complete);
  const revisionId = () => `APP-FOUNDATION-REV-${String(state.revisionSequence || 0).padStart(3, "0")}`;
  const persist = () => {
    state.pendingWrite = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };
  const ensureStarted = () => {
    if (state.interviewState === STATES.NOT_STARTED) state.interviewState = STATES.IN_PROGRESS;
  };
  const saveAnswer = (fieldIndex, value, options = {}) => {
    ensureStarted();
    const [id, citation, question, section] = fields[fieldIndex];
    const text = normalize(value);
    if (!text) return null;
    const existing = state.answers[id] || {};
    const previousText = existing.text || "";
    const changed = previousText && previousText !== text;
    if (!existing.complete || changed || options.forceRevision) {
      state.revisionSequence += 1;
      const timestamp = nowIso();
      const revision = {
        id: `${id}-REV-${String((existing.revisions?.length || 0) + 1).padStart(2, "0")}`,
        applicationRevision: revisionId(),
        timestamp,
        previousAnswer: previousText || "",
        answer: text,
        source: "applicant-provided"
      };
      state.answers[id] = {
        id,
        fieldNumber: fieldIndex + 1,
        citation,
        question,
        section,
        text,
        complete: true,
        source: "applicant-provided",
        evidenceStatus: existing.evidenceStatus || "Evidence required",
        evidenceReferences: existing.evidenceReferences || [],
        assignedPerson: existing.assignedPerson || "",
        status: options.status || existing.status || "ANSWER_CONFIRMED",
        createdAt: existing.createdAt || timestamp,
        updatedAt: timestamp,
        revisions: [...(existing.revisions || []), revision],
        limitations: existing.limitations || ["Supporting evidence has not been verified in this browser demonstration."]
      };
      state.applicationRevision = revisionId();
      state.lastSavedAt = timestamp;
    }
    return state.answers[id];
  };
  const savePeople = () => {
    const people = [...workspace.querySelectorAll("[data-person-row]")].map((row) => ({
      name: normalize(row.querySelector("[data-person='name']")?.value),
      title: normalize(row.querySelector("[data-person='title']")?.value),
      role: normalize(row.querySelector("[data-person='role']")?.value),
      address: normalize(row.querySelector("[data-person='address']")?.value),
      citizenship: normalize(row.querySelector("[data-person='citizenship']")?.value)
    })).filter((person) => person.name && person.title && person.address && person.citizenship);
    if (!people.length) return null;
    const text = people.map((person) => `${person.name}, ${person.title}, ${person.role}, ${person.address}, citizenship: ${person.citizenship}`).join("; ");
    const answer = saveAnswer(state.field, text);
    if (answer) answer.people = people;
    return answer;
  };
  const completeIntake = () => {
    if (!allRequiredAnswered() || state.pendingWrite || !state.applicationRevision) return false;
    state.interviewState = STATES.INTAKE_COMPLETE;
    state.readinessState = STATES.REVIEW_REQUIRED;
    state.completedAt = state.completedAt || nowIso();
    state.view = "summary";
    state.returnToSummary = false;
    persist();
    return true;
  };
  const continueAfterSave = () => {
    if (state.returnToSummary && allRequiredAnswered()) {
      completeIntake();
      update(false);
      return;
    }
    if (state.field === fields.length - 1) {
      completeIntake();
      update(false);
      return;
    }
    state.view = "evidence";
    persist();
    update(false);
  };
  const requestEvidence = (status) => {
    const answer = state.answers[currentId()];
    if (!answer) return;
    answer.evidenceStatus = status;
    answer.updatedAt = nowIso();
    state.lastSavedAt = answer.updatedAt;
    state.view = "evidence-result";
    persist();
    update(false);
  };
  const nextField = () => {
    if (state.field + 1 < fields.length) {
      state.field += 1;
      state.view = "question";
    } else if (allRequiredAnswered()) {
      state.view = "summary";
      state.interviewState = STATES.INTAKE_COMPLETE;
    }
    persist();
    update(false);
  };
  const summary = () => {
    const records = answeredRecords();
    const evidenceAttached = records.filter((answer) => answer.evidenceReferences?.length).length;
    const assignments = records.filter((answer) => answer.assignedPerson).length;
    const unanswered = fields.length - records.length;
    const evidenceRequired = records.filter((answer) => !answer.evidenceReferences?.length).length;
    return {
      records,
      confirmed: records.length,
      unanswered,
      evidenceAttached,
      evidenceRequired,
      assignmentsOutstanding: records.length - assignments,
      conflicts: 0,
      stale: 0,
      humanReview: records.length,
      evidencePercent: records.length ? Math.round((evidenceAttached / records.length) * 100) : 0
    };
  };
  const answerFor = (id) => state.answers[id]?.text || "Not provided";
  const overview = () => [
    ["Project/applicant", answerFor("legal-name")],
    ["Reactor or technology", answerFor("safety")],
    ["Site/jurisdiction", `${answerFor("address")} · ${answerFor("organization")}`],
    ["Licensing path", answerFor("license")],
    ["Interview completion date", state.completedAt ? new Date(state.completedAt).toLocaleString() : "Not complete"],
    ["Application record/revision", state.applicationRevision || "Not recorded"]
  ];
  const blockers = () => {
    const items = [];
    for (const answer of answeredRecords()) {
      if (!answer.evidenceReferences?.length) {
        items.push({
          title: `Field ${answer.fieldNumber}: evidence still required`,
          missing: "A controlled supporting record has not been attached.",
          why: "Applicant responses remain an application foundation until source evidence is verified.",
          required: "Attach or request the official record, then complete qualified review.",
          owner: answer.assignedPerson || "Unassigned",
          action: "Resolve evidence gaps"
        });
      }
    }
    if (!items.length) items.push({title: "Qualified readiness review required", missing: "Submission-readiness determination has not been made.", why: "Guided intake and NRC submission readiness are separate controls.", required: "Human review of evidence, conflicts, and open regulatory decisions.", owner: "Unassigned", action: "Review my application"});
    return items;
  };
  const atlasEyeMessage = () => {
    if (state.view === "summary" || state.interviewState === STATES.INTAKE_COMPLETE) return "Application foundation complete. Evidence verification and NRC submission readiness remain unresolved.";
    if (state.view === "evidence") return "Atlas saved this answer and is preserving the supporting-record gap separately.";
    if (state.field === 0) return "Let’s confirm the applicant’s official legal name.";
    return `Next, let’s continue with field ${state.field + 1}.`;
  };
  const progressMarkup = () => {
    const completed = answeredRecords().length;
    const complete = state.interviewState === STATES.INTAKE_COMPLETE;
    const label = complete ? "Application foundation complete" : `Field ${state.field + 1} of ${fields.length}`;
    const width = complete ? 100 : ((state.field + 1) / fields.length) * 100;
    return `<span>${esc(label)}</span><span class="progress-track"><i style="width:${width}%"></i></span><div class="atlas-eye-context" data-eye-state="${complete ? "INTAKE_COMPLETE" : "AVAILABLE"}" role="status" aria-label="AtlasEye state"><img src="assets/logos/atlas-nuclear-logo-original.png" alt=""> <span><b>AtlasEye</b> ${esc(atlasEyeMessage())}</span></div><p class="progress-transition">${complete ? "Guided intake: 14 of 14 answered" : `Guided intake: ${completed} of ${fields.length} answered`}</p>`;
  };
  const renderQuestion = () => {
    const [id, citation, question] = current();
    const answer = state.answers[id];
    const editing = state.returnToSummary ? `<p class="edit-return-note">Editing Field ${state.field + 1}. Saving returns to the completed application summary.</p>` : "";
    if (id === "citizenship") {
      const people = answer?.people?.length ? answer.people : [{name: "", title: "", role: "Director", address: "", citizenship: ""}];
      workspace.innerHTML = `${editing}<p class="citation">${esc(citation)}</p><h1>${esc(question)}</h1><p class="guided-explanation">Identify directors and principal officers without treating citizenship as an eligibility conclusion.</p><div class="person-entry">${people.map((person) => `<div class="person-row" data-person-row><input data-person="name" placeholder="Full legal name" value="${esc(person.name)}"><input data-person="title" placeholder="Title" value="${esc(person.title)}"><select data-person="role"><option${person.role === "Director" ? " selected" : ""}>Director</option><option${person.role === "Principal officer" ? " selected" : ""}>Principal officer</option><option${person.role === "Director and principal officer" ? " selected" : ""}>Director and principal officer</option></select><input data-person="address" placeholder="Business address" value="${esc(person.address)}"><input data-person="citizenship" placeholder="Citizenship country or countries" value="${esc(person.citizenship)}"></div>`).join("")}</div><button class="primary" type="button" data-action="continue-people">Continue</button><div class="assistance"><button type="button" data-action="explain">Why is this needed?</button><button type="button" data-action="assign">Assign to someone</button></div>`;
      return;
    }
    if (id === "eligibility") {
      workspace.innerHTML = `${editing}<p class="citation">${esc(citation)}</p><h1>${esc(question)}</h1><p class="hold-note"><b>LEGAL ELIGIBILITY REVIEW REQUIRED</b><br>Atlas cannot determine eligibility. A qualified legal review remains required before this item can support readiness.</p><button class="primary" type="button" data-action="create-eligibility">${answer?.complete ? "Update legal-review record" : "Open legal-review assignment"}</button><div class="assistance"><button type="button" data-action="explain">Why is this needed?</button><button type="button" data-action="assign">Assign to someone</button></div>`;
      return;
    }
    const value = answer?.text || "";
    workspace.innerHTML = `${editing}<p class="citation">${esc(citation)}</p><h1>${esc(question)}</h1><label class="sr-only" for="answer">Answer</label>${id === "focd" ? `<textarea id="answer" data-input="answer" placeholder="Enter a confirmed answer">${esc(value)}</textarea>` : `<input id="answer" data-input="answer" type="text" value="${esc(value)}" placeholder="${state.field === 0 ? "Enter the organization’s legal name" : "Enter a confirmed answer"}">`}<button class="primary" type="button" data-action="continue">Continue</button><div class="assistance"><button type="button" data-action="explain">Why is this needed?</button><button type="button" data-action="assign">Assign to someone</button></div>`;
  };
  const renderEvidence = () => {
    const answer = state.answers[currentId()];
    workspace.innerHTML = `<p class="eyebrow">Supporting document</p><p class="citation">${esc(current()[1])}</p><h1>What official document supports this answer?</h1><div class="answer-summary"><span>Your answer</span><b>${esc(answer?.text || "No confirmed answer entered")}</b></div><div class="evidence-status" role="status"><b>No controlled record has been added</b><span>This demo cannot upload or retrieve project documents. Atlas will keep the evidence gap visible in the application summary.</span></div><div class="evidence-options"><button class="primary" type="button" data-action="request-record"><b>Request the document</b><small>Create a work item for this field’s official supporting record.</small></button><button type="button" data-action="hold-field"><b>Continue without a document</b><small>Save the answer and keep evidence unresolved.</small></button></div><button class="quiet-link" type="button" data-action="return">Return to the question</button>`;
  };
  const renderEvidenceResult = () => {
    const next = state.field + 1 < fields.length ? `Continue to Field ${state.field + 2}` : "Complete application foundation";
    workspace.innerHTML = `<p class="eyebrow">Supporting document</p><p class="citation">${esc(current()[1])}</p><h1>Evidence gap preserved</h1><p class="result-note">Atlas saved the answer and recorded that supporting evidence remains unresolved.</p><button class="primary" type="button" data-action="next-field">${esc(next)}</button><button class="quiet-link" type="button" data-action="return">Return to the question</button>`;
  };
  const recordCard = (answer) => `<article class="summary-record"><div><span>Field ${answer.fieldNumber}</span><h3>${esc(answer.question)}</h3></div><p>${esc(answer.text)}</p><dl><div><dt>Source</dt><dd>${esc(answer.source)}</dd></div><div><dt>Evidence status</dt><dd>${esc(answer.evidenceStatus)}</dd></div><div><dt>Assigned person</dt><dd>${esc(answer.assignedPerson || "Unassigned")}</dd></div><div><dt>Revision/history</dt><dd>${answer.revisions?.length || 0} revision${(answer.revisions?.length || 0) === 1 ? "" : "s"} preserved</dd></div></dl><button type="button" class="quiet-link" data-action="edit-field" data-field="${answer.fieldNumber - 1}">Edit answer</button></article>`;
  const renderSummary = () => {
    const data = summary();
    const grouped = fields.reduce((groups, field) => {
      const answer = state.answers[field[0]];
      if (answer?.complete) (groups[field[3]] ||= []).push(answer);
      return groups;
    }, {});
    workspace.innerHTML = `<section class="completion-workspace" data-completion-state="${esc(state.interviewState)}"><p class="eyebrow">Application foundation complete</p><h1>APPLICATION FOUNDATION COMPLETE</h1><p class="completion-boundary">Atlas has organized your responses into a traceable Part 53 application foundation. Completion of this guided intake does not mean the application is ready for submission or approved by the NRC.</p><section class="summary-section"><h2>APPLICATION OVERVIEW</h2><dl class="overview-grid">${overview().map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl></section><section class="summary-section"><h2>WHAT ATLAS BUILT</h2>${Object.entries(grouped).map(([section, answers]) => `<div class="application-section"><h3>${esc(section)}</h3>${answers.map(recordCard).join("")}</div>`).join("")}</section><section class="summary-section"><h2>COMPLETION VERSUS READINESS</h2><div class="readiness-grid"><div><span>Guided intake</span><b>${data.confirmed} of ${fields.length} answered</b></div><div><span>Application foundation</span><b>Complete</b></div><div><span>Evidence verification</span><b>${data.evidenceAttached} of ${data.confirmed} attached (${data.evidencePercent}%)</b></div><div><span>NRC submission readiness</span><b>NOT READY</b></div></div></section><section class="summary-section"><h2>READINESS SUMMARY</h2><dl class="readiness-counts"><div><dt>Confirmed answers</dt><dd>${data.confirmed}</dd></div><div><dt>Unanswered or incomplete items</dt><dd>${data.unanswered}</dd></div><div><dt>Evidence attached</dt><dd>${data.evidenceAttached}</dd></div><div><dt>Evidence still required</dt><dd>${data.evidenceRequired}</dd></div><div><dt>Assignments outstanding</dt><dd>${data.assignmentsOutstanding}</dd></div><div><dt>Conflicts or stale information</dt><dd>${data.conflicts + data.stale}</dd></div><div><dt>Human-review items</dt><dd>${data.humanReview}</dd></div></dl></section><section class="summary-section" data-summary-section="gaps"><h2>APPLICATION GAPS AND BLOCKERS</h2>${blockers().map((item) => `<article class="blocker-card"><h3>${esc(item.title)}</h3><p><b>What is missing:</b> ${esc(item.missing)}</p><p><b>Why it matters:</b> ${esc(item.why)}</p><p><b>Evidence or decision required:</b> ${esc(item.required)}</p><p><b>Responsible party:</b> ${esc(item.owner)}</p><p><b>Recommended next action:</b> ${esc(item.action)}</p></article>`).join("")}</section><section class="summary-section"><h2>TRACEABILITY RECORD</h2><ul class="traceability-list"><li>Every answer: preserved in the browser application record.</li><li>Answer revisions: preserved with revision identifiers and timestamps generated when the applicant saves.</li><li>Timestamps: recorded only for saves that occurred in this session.</li><li>Assignments: shown when assigned; otherwise marked unassigned.</li><li>Evidence references: no references are fabricated; missing records remain unresolved.</li><li>Unresolved limitations: retained with each field until evidence and human review are complete.</li></ul></section><section class="summary-section actions-section"><h2>NEXT ACTIONS</h2><div class="summary-actions"><button class="primary" type="button" data-action="review-application">REVIEW MY APPLICATION</button><button type="button" data-action="resolve-gaps">RESOLVE EVIDENCE GAPS</button><button type="button" data-action="choose-edit">EDIT AN ANSWER</button><a class="summary-link" href="/mission-control/">RETURN TO MISSION CONTROL</a><button type="button" data-action="print-summary">PRINT / SAVE SUMMARY</button></div></section></section>`;
  };
  const renderEditChooser = () => {
    workspace.innerHTML = `<section class="completion-workspace"><p class="eyebrow">Edit answer</p><h1>Select an answer to revise</h1><p class="completion-boundary">Choose a field, update the applicant-provided answer, and Atlas will return to the application summary with revision history preserved.</p><div class="edit-field-list">${fields.map((field, index) => `<button type="button" data-action="edit-field" data-field="${index}"><span>Field ${index + 1}</span>${esc(field[2])}</button>`).join("")}</div><button class="quiet-link" type="button" data-action="summary">Return to summary</button></section>`;
  };
  const render = () => {
    if (state.interviewState === STATES.INTAKE_COMPLETE && state.view !== "edit-chooser" && state.view !== "question") state.view = "summary";
    progress.innerHTML = progressMarkup();
    if (state.view === "summary") renderSummary();
    else if (state.view === "edit-chooser") renderEditChooser();
    else if (state.view === "evidence") renderEvidence();
    else if (state.view === "evidence-result") renderEvidenceResult();
    else renderQuestion();
    workspace.dataset.state = state.interviewState;
    workspace.setAttribute("aria-busy", state.pendingWrite ? "true" : "false");
  };
  const capture = () => ({scroll: window.scrollY, activeId: document.activeElement?.id || ""});
  const restore = (snapshot) => requestAnimationFrame(() => {
    if (snapshot?.activeId) document.getElementById(snapshot.activeId)?.focus({preventScroll: true});
    window.scrollTo(0, snapshot?.scroll || 0);
  });
  const update = (preserve = true) => {
    const snapshot = preserve ? capture() : null;
    render();
    workspace.classList.add("is-entering");
    requestAnimationFrame(() => workspace.classList.remove("is-entering"));
    if (snapshot) restore(snapshot);
  };
  const previewMarkup = () => {
    const data = summary();
    if (!data.records.length) return `<h2>Application preview</h2><p>No applicant answers have been saved yet.</p>`;
    return `<h2>Application preview</h2><p>The preview is generated from ${data.confirmed} persisted applicant answer${data.confirmed === 1 ? "" : "s"}.</p>${Object.entries(data.records.reduce((groups, answer) => { (groups[answer.section] ||= []).push(answer); return groups; }, {})).map(([section, answers]) => `<section class="preview-section"><h3>${esc(section)}</h3>${answers.map((answer) => `<p><b>Field ${answer.fieldNumber}: ${esc(answer.citation)}</b><br>${esc(answer.text)}<br><span>${esc(answer.evidenceStatus)} · ${answer.revisions?.length || 0} revision${(answer.revisions?.length || 0) === 1 ? "" : "s"}</span></p>`).join("")}</section>`).join("")}`;
  };
  const drawerMarkup = (kind) => {
    if (kind === "preview") return previewMarkup();
    if (kind === "assign") return `<h2>Assign this work</h2><p>Assignments are preserved as traceability only. They do not establish readiness or approval.</p><label>Responsible person<input data-assignee placeholder="Unassigned" value="${esc(state.answers[currentId()]?.assignedPerson || "")}"></label><button class="primary" type="button" data-action="save-assignment">Save assignment</button>`;
    if (kind === "explain") return `<h2>Why this is needed</h2><p>The applicant-specific answer supports a traceable Part 53 application foundation. Atlas guidance is not an NRC interpretation, readiness decision, or approval.</p>`;
    return `<h2>Menu</h2><button type="button" data-action="summary">Application summary</button><button type="button" data-action="choose-edit">Edit an answer</button><button type="button" data-action="restart">Restart session</button>`;
  };
  const openDrawer = (kind) => {
    state.drawer = kind;
    drawer.hidden = false;
    drawer.innerHTML = `<aside class="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><button class="drawer-close" type="button" data-action="close">Close</button><div id="drawer-title">${drawerMarkup(kind)}</div></aside>`;
    drawer.querySelector(".drawer-close")?.focus({preventScroll: true});
  };
  const closeDrawer = () => {
    drawer.hidden = true;
    drawer.innerHTML = "";
    state.drawer = "";
  };
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    event.preventDefault();
    const action = button.dataset.action;
    if (action === "menu" || action === "preview" || action === "assign" || action === "explain") { openDrawer(action); return; }
    if (action === "close") { closeDrawer(); return; }
    if (action === "continue") {
      if (state.pendingWrite) return;
      const text = normalize(workspace.querySelector("#answer")?.value);
      if (!text) return;
      state.pendingWrite = true;
      button.disabled = true;
      saveAnswer(state.field, text);
      persist();
      continueAfterSave();
      return;
    }
    if (action === "continue-people") {
      if (state.pendingWrite) return;
      state.pendingWrite = true;
      button.disabled = true;
      if (!savePeople()) { state.pendingWrite = false; button.disabled = false; return; }
      persist();
      continueAfterSave();
      return;
    }
    if (action === "create-eligibility") {
      state.pendingWrite = true;
      button.disabled = true;
      const answer = saveAnswer(state.field, "Qualified legal eligibility review remains required before readiness can be determined.", {status: "HELD_FOR_LEGAL_REVIEW"});
      if (answer) answer.limitations = ["Eligibility is unresolved until qualified legal review is complete."];
      persist();
      continueAfterSave();
      return;
    }
    if (action === "request-record") { requestEvidence("Evidence requested"); return; }
    if (action === "hold-field") { requestEvidence("Evidence required"); return; }
    if (action === "next-field") { nextField(); return; }
    if (action === "return") { state.view = "question"; persist(); update(false); return; }
    if (action === "summary" || action === "review-application") { closeDrawer(); state.view = "summary"; persist(); update(false); return; }
    if (action === "choose-edit") { closeDrawer(); state.view = "edit-chooser"; persist(); update(false); return; }
    if (action === "edit-field") {
      state.field = Number(button.dataset.field);
      state.view = "question";
      state.returnToSummary = true;
      closeDrawer();
      persist();
      update(false);
      return;
    }
    if (action === "resolve-gaps") {
      document.querySelector('[data-summary-section="gaps"]')?.scrollIntoView({block: "start"});
      return;
    }
    if (action === "print-summary") { window.print(); return; }
    if (action === "save-assignment") {
      const answer = state.answers[currentId()];
      if (answer) {
        answer.assignedPerson = normalize(drawer.querySelector("[data-assignee]")?.value) || "Unassigned";
        answer.updatedAt = nowIso();
        state.lastSavedAt = answer.updatedAt;
        persist();
      }
      closeDrawer();
      update();
      return;
    }
    if (action === "restart") {
      localStorage.removeItem(STORAGE_KEY);
      Object.assign(state, defaultState());
      closeDrawer();
      update(false);
    }
  });
  window.__PART53_DEMO__ = {
    storageKey: STORAGE_KEY,
    fields: fields.map(([id, citation, question, section]) => ({id, citation, question, section})),
    getState: () => JSON.parse(JSON.stringify(state)),
    summary
  };
  if (state.interviewState === STATES.INTAKE_COMPLETE && allRequiredAnswered()) state.view = "summary";
  render();
})();
