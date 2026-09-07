# Represented requirement-to-authority audit

Audited starting SHA: faea837fd10763c5d0c6322f2df37c04dd25e683 (PR #20 merged). Human source review: 2026-09-07.

Scope: 18 requirements (8 application, 8 transportation, 2 supplier), 14 intake questions, 2 bounded decision types, and 1 optional maritime control: **35 stable items**. Derived findings and next actions reuse these IDs; they are not additional legal requirements. Categories: A 16, B 0, C 0, D 0, E 0, F 0, G 17, H 2. No guidance, industry standard, license or order is asserted as an applicable authority. Two professional-review items have supporting regulations but are not legal duties to obtain a particular memo.

The official provisions supporting the bounded claims were read. Broader route/security/execution/authorization conclusions and maritime law remain verification pending/outside scope. Workflow controls intentionally do not assert those legal conclusions. HRCQ, financial exceptions, eligibility and environmental-path applicability remain unresolved even where source text is verified. No “all answers legally grounded” conclusion is made.

See [source review evidence](source-verification-2026-09-07.md). Exact authority records and version metadata live in src/legalBasis.js; no live HTTP result changes their status.

## p53-legal

- Current claim/question at baseline: Applicant identity — Confirm applicant legal name and organization record.
- Baseline citation: part53. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: A. Statute or regulation.
- Exact support: 10 CFR § 53.1109(a)–(e). Authority IDs: nrc-general.
- Applicability facts: legal-name, address, business, organization, citizenship, focd, license. Use only the represented project and the current facts below.
- Exceptions/missing facts: Entity form and any agency relationship determine the applicable paragraph of (d). Other application sections are outside the fourteen questions.
- Evidence: Applicant information and organization support. Direct authority: applicant information. Atlas choice: organization support file and version links. A citation or attachment alone never establishes acceptance.
- Wording decision: Retain bounded information question; add subsection, exceptions, source status and separate applicability.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## p53-financial

- Current claim/question at baseline: Financial qualifications — Attach financial qualification support.
- Baseline citation: part53. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: A. Statute or regulation.
- Exact support: 10 CFR § 53.1413, introductory text and (a)–(b); 10 CFR § 53.1109(a)–(e). Authority IDs: nrc-finance, nrc-general.
- Applicability facts: license, financial. Use only the represented project and the current facts below.
- Exceptions/missing facts: Electric-utility status and the post-§ 53.1452 finding exception are not resolved by the intake.
- Evidence: Financial capacity plan, estimates and funding-source information; Atlas tracks a sample plan, not financial qualification. Direct authority: financial information described in § 53.1413. Atlas choice: the supplied preliminary plan and workflow review. A citation or attachment alone never establishes acceptance.
- Wording decision: Retain bounded information question; add subsection, exceptions, source status and separate applicability.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## p53-safety

- Current claim/question at baseline: Safety analysis content — What safety analysis supports this application?
- Baseline citation: part53. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: A. Statute or regulation.
- Exact support: 10 CFR § 53.1416(a), introductory text. Authority IDs: nrc-safety.
- Applicability facts: license, safety. Use only the represented project and the current facts below.
- Exceptions/missing facts: Referenced design/site approvals and the full technical content are not assessed.
- Evidence: Controlled FSAR for actual application use; sample summary is preliminary. Direct authority: FSAR under § 53.1416(a). Atlas choice: retain a preliminary sample summary as evidence of work in progress, not a completed FSAR. A citation or attachment alone never establishes acceptance.
- Wording decision: Retain bounded information question; add subsection, exceptions, source status and separate applicability.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## p53-environment

- Current claim/question at baseline: Environmental information — Attach environmental information support.
- Baseline citation: part53. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: A. Statute or regulation.
- Exact support: 10 CFR § 53.1419(a)(1)(i)–(ii); 10 CFR § 51.50(c). Authority IDs: nrc-environment, nrc-environment-content.
- Applicability facts: license, environment. Use only the represented project and the current facts below.
- Exceptions/missing facts: Limited work authorization and referenced permit facts are missing; complete environmental content is outside scope.
- Evidence: Separate environmental report; sample outline does not establish its adequacy. Direct authority: environmental report under §§ 53.1419(a)(1) and 51.50(c). Atlas choice: retain the sample outline without treating it as adequate. A citation or attachment alone never establishes acceptance.
- Wording decision: Retain bounded information question; add subsection, exceptions, source status and separate applicability.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## p53-eligibility

- Current claim/question at baseline: Legal eligibility review — Create or attach the eligibility review record.
- Baseline citation: part53. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: H. Professional judgment or interpretation.
- Exact support: 10 CFR § 53.1118, introductory text and (a)–(b); 10 CFR § 53.1109(a)–(e); Atlas workflow v3. Authority IDs: nrc-eligibility, nrc-general, atlas-workflow.
- Applicability facts: focd, organization, eligibility. Use only the represented project and the current facts below.
- Exceptions/missing facts: Ownership/control facts, country conditions and any Commission determination remain unverified.
- Evidence: Qualified legal reasoning and ownership records. A legal-review memo is an Atlas evidence choice, not a prescribed document. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Clarified: retain conditional exception in § 53.1118(a)–(b); legal memo is Atlas evidence choice.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## trn-material

- Current claim/question at baseline: Material and HRCQ facts — Record the activity/package threshold facts needed to resolve HRCQ.
- Baseline citation: transportHrcq. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: A. Statute or regulation.
- Exact support: 49 CFR § 173.403, Highway route controlled quantity (1)–(3); A1, A2 and normal/special form definitions. Authority IDs: dot-hrcq.
- Applicability facts: material, form, enrichment, quantityValue, quantityUnit, hrcqStatus, hrcqBasis. Use only the represented project and the current facts below.
- Exceptions/missing facts: Activity per package, radionuclides and applicable activity values are missing. Resolve HRCQ facts selects a sample assumption only.
- Evidence: Activity and package threshold analysis; no real HRCQ calculation is supplied. Authority supplies a definition, not an Atlas intake duty. Atlas requests activity and package facts to support a future threshold analysis. A citation or attachment alone never establishes acceptance.
- Wording decision: Clarified: Resolve HRCQ facts selects a sample assumption, never a legal calculation.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## trn-response

- Current claim/question at baseline: Emergency response information — Attach response organization or exercise evidence.
- Baseline citation: transportEmergency. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: A. Statute or regulation.
- Exact support: 49 CFR § 172.600(a)–(d); 49 CFR § 172.602(a)–(c); 49 CFR § 172.604(a)–(d); Atlas workflow v3. Authority IDs: dot-response-scope, dot-response, dot-phone, atlas-workflow.
- Applicability facts: material, routeProfile, emergencyEvidence. Use only the represented project and the current facts below.
- Exceptions/missing facts: Shipping-paper exceptions and offeror/handler roles are not established. Exercise records do not demonstrate all information or telephone requirements.
- Evidence: Response information and contact availability for real compliance; Atlas sample response/exercise evidence supports only the demo gate. Direct authority: response information and applicable telephone duties. Atlas choice: the sample response/exercise record and assessment dropdown; these cannot prove all regulatory elements. A citation or attachment alone never establishes acceptance.
- Wording decision: Clarified: exercise/organization evidence is an Atlas gate, not proof of all Subpart G information and telephone duties.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## p53-records

- Current claim/question at baseline: Controlled record inventory — Complete the controlled record inventory.
- Baseline citation: atlasGovernance. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: evidence. Use only the represented project and the current facts below.
- Exceptions/missing facts: No legal document-control contract is represented.
- Evidence: Section-to-record inventory. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Label explicitly as Atlas control; remove contract/statutory implication. No underlying industry standard is presumed binding.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## p53-reviews

- Current claim/question at baseline: Review status — Assign remaining review actions.
- Baseline citation: atlasGovernance. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: reviews. Use only the represented project and the current facts below.
- Exceptions/missing facts: A review assignment is not an agency determination.
- Evidence: Responsible roles and open actions. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Label explicitly as Atlas control; remove contract/statutory implication. No underlying industry standard is presumed binding.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## p53-history

- Current claim/question at baseline: Application history — Inspect history before report generation.
- Baseline citation: atlasGovernance. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: history. Use only the represented project and the current facts below.
- Exceptions/missing facts: Browser history is not production regulatory recordkeeping.
- Evidence: Prior versions and decisions. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Label explicitly as Atlas control; remove contract/statutory implication. No underlying industry standard is presumed binding.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## trn-package

- Current claim/question at baseline: Package compatibility — Attach or load package compatibility evidence.
- Baseline citation: atlasGovernance. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: material, form, enrichment, quantityValue, quantityUnit. Use only the represented project and the current facts below.
- Exceptions/missing facts: Actual package certificate, authorized contents and transport permission are outside scope; no party-specific authority is supplied.
- Evidence: The supplied package record covers exactly HALEU UF6, 19.75 wt%, 12 kgU. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Label explicitly as Atlas control; remove contract/statutory implication. No underlying industry standard is presumed binding.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## trn-carrier

- Current claim/question at baseline: Carrier authority — Confirm carrier authority evidence.
- Baseline citation: atlasGovernance. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: routeProfile, carrierEvidence. Use only the represented project and the current facts below.
- Exceptions/missing facts: Actual carrier permits, registration and operating authority are not verified.
- Evidence: Sample carrier record plus scenario assessment. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Label explicitly as Atlas control; remove contract/statutory implication. No underlying industry standard is presumed binding.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## trn-route

- Current claim/question at baseline: Route and mode — Confirm route and mode evidence.
- Baseline citation: transportHrcq. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: origin, destination, routeProfile, hrcqStatus. Use only the represented project and the current facts below.
- Exceptions/missing facts: The former HRCQ citation defines a quantity; it does not establish route compliance. Actual routing law and maritime authority verification are pending outside this implementation.
- Evidence: Route record for the stated Ohio-to-Pennsylvania highway scenario. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Corrected: HRCQ definition cannot establish route compliance; label route gate Atlas control.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## trn-security

- Current claim/question at baseline: Security and physical protection — Resolve security evidence.
- Baseline citation: atlasGovernance. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: routeProfile, securityEvidence. Use only the represented project and the current facts below.
- Exceptions/missing facts: No security plan sufficiency, applicable protection regime or license/order is verified.
- Evidence: Public sample security readiness record and scope selection. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Label explicitly as Atlas control; remove contract/statutory implication. No underlying industry standard is presumed binding.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## trn-execution

- Current claim/question at baseline: Shipment execution — Complete shipment execution evidence.
- Baseline citation: atlasGovernance. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: routeProfile, executionEvidence. Use only the represented project and the current facts below.
- Exceptions/missing facts: Actual inspections, measurements, shipping papers and package authorizations remain separate qualified checks.
- Evidence: Sample pre-departure record and scope assessment. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Label explicitly as Atlas control; remove contract/statutory implication. No underlying industry standard is presumed binding.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## trn-reviewer

- Current claim/question at baseline: Governed reviewer — Assign a demo authorized reviewer.
- Baseline citation: atlasGovernance. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: reviewer. Use only the represented project and the current facts below.
- Exceptions/missing facts: No real reviewer identity or authority is authenticated.
- Evidence: Explicit demonstration reviewer selection. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Label explicitly as Atlas control; remove contract/statutory implication. No underlying industry standard is presumed binding.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## sup-qap-current

- Current claim/question at baseline: Current quality program document — Replace the superseded quality program document.
- Baseline citation: atlasGovernance. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: supplier, expectedQualityProgramIdentity, expectedQualityProgramVersion. Use only the represented project and the current facts below.
- Exceptions/missing facts: No contract, license incorporation or NQA-1 edition/text was supplied or verified. No standard is treated as binding.
- Evidence: Matching Quality Program Manual Rev. C and supersession metadata. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Label explicitly as Atlas control; remove contract/statutory implication. No underlying industry standard is presumed binding.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## sup-calibration

- Current claim/question at baseline: Calibration record sample — Attach a calibration record sample.
- Baseline citation: atlasGovernance. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: supplier, itemScope. Use only the represented project and the current facts below.
- Exceptions/missing facts: A single sample does not establish calibration-program effectiveness or full qualification.
- Evidence: The supplied calibration sample linked to this supplier. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Label explicitly as Atlas control; remove contract/statutory implication. No underlying industry standard is presumed binding.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## trn-governed-review

- Current claim/question at baseline: Bounded transportation review decision. Derived bounded review or scenario action.
- Baseline citation: Atlas public demo governance control. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: material, routeProfile, reviewer. Use only the represented project and the current facts below.
- Exceptions/missing facts: Only simulated gate acceptance; all legal determinations remain separate.
- Evidence: Current evaluation fingerprint and the reviewed evidence versions. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Label explicitly as Atlas control; remove contract/statutory implication. No underlying industry standard is presumed binding.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## supplier-decision

- Current claim/question at baseline: Bounded supplier review decision. Derived bounded review or scenario action.
- Baseline citation: Atlas public demo governance control. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: supplier, expectedQualityProgramVersion. Use only the represented project and the current facts below.
- Exceptions/missing facts: Professional reasoning is recorded as the reviewer’s judgment, never attributed to an agency.
- Evidence: Reviewer explanation plus current quality program and calibration sample. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Label explicitly as Atlas control; remove contract/statutory implication. No underlying industry standard is presumed binding.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## trn-maritime

- Current claim/question at baseline: Optional maritime/change scenario. Derived bounded review or scenario action.
- Baseline citation: Atlas public demo governance control. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: routeProfile. Use only the represented project and the current facts below.
- Exceptions/missing facts: Outside the implemented legal scope: port, vessel, flag-state and destination authorities are verification pending.
- Evidence: Scenario selections for added transport segments. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Label explicitly as Atlas control; remove contract/statutory implication. No underlying industry standard is presumed binding.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## q-legal-name

- Current claim/question at baseline: What is the exact legal name of the organization applying for the license?
- Baseline citation: 10 CFR § 53.1109(a). Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: A. Statute or regulation.
- Exact support: 10 CFR § 53.1109(a). Authority IDs: nrc-general.
- Applicability facts: license, legal-name. Use only the represented project and the current facts below.
- Exceptions/missing facts: Entity form and any agency relationship determine the applicable paragraph of (d). Other application sections are outside the fourteen questions.
- Evidence: Applicant information and organization support. Direct authority: applicant information. Atlas choice: organization support file and version links. A citation or attachment alone never establishes acceptance.
- Wording decision: Retain bounded information question; add subsection, exceptions, source status and separate applicability.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## q-address

- Current claim/question at baseline: What is the applicant’s address?
- Baseline citation: 10 CFR § 53.1109(b). Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: A. Statute or regulation.
- Exact support: 10 CFR § 53.1109(b). Authority IDs: nrc-general.
- Applicability facts: license, address. Use only the represented project and the current facts below.
- Exceptions/missing facts: Entity form and any agency relationship determine the applicable paragraph of (d). Other application sections are outside the fourteen questions.
- Evidence: Applicant information and organization support. Direct authority: applicant information. Atlas choice: organization support file and version links. A citation or attachment alone never establishes acceptance.
- Wording decision: Retain bounded information question; add subsection, exceptions, source status and separate applicability.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## q-business

- Current claim/question at baseline: What business or occupation does the applicant conduct?
- Baseline citation: 10 CFR § 53.1109(c). Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: A. Statute or regulation.
- Exact support: 10 CFR § 53.1109(c). Authority IDs: nrc-general.
- Applicability facts: license, business. Use only the represented project and the current facts below.
- Exceptions/missing facts: Entity form and any agency relationship determine the applicable paragraph of (d). Other application sections are outside the fourteen questions.
- Evidence: Applicant information and organization support. Direct authority: applicant information. Atlas choice: organization support file and version links. A citation or attachment alone never establishes acceptance.
- Wording decision: Retain bounded information question; add subsection, exceptions, source status and separate applicability.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## q-organization

- Current claim/question at baseline: What is the applicant’s organization type, State of organization, and principal place of business?
- Baseline citation: 10 CFR § 53.1109(d)(3)(i). Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: A. Statute or regulation.
- Exact support: 10 CFR § 53.1109(d)(3)(i). Authority IDs: nrc-general.
- Applicability facts: license, organization. Use only the represented project and the current facts below.
- Exceptions/missing facts: Entity form and any agency relationship determine the applicable paragraph of (d). Other application sections are outside the fourteen questions.
- Evidence: Applicant information and organization support. Direct authority: applicant information. Atlas choice: organization support file and version links. A citation or attachment alone never establishes acceptance.
- Wording decision: Retain bounded information question; add subsection, exceptions, source status and separate applicability.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## q-citizenship

- Current claim/question at baseline: Who are the applicant’s directors and principal officers?
- Baseline citation: 10 CFR § 53.1109(d)(3)(ii). Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: A. Statute or regulation.
- Exact support: 10 CFR § 53.1109(d)(3)(ii). Authority IDs: nrc-general.
- Applicability facts: license, citizenship, organization. Use only the represented project and the current facts below.
- Exceptions/missing facts: Entity form and any agency relationship determine the applicable paragraph of (d). Other application sections are outside the fourteen questions.
- Evidence: Applicant information and organization support. Direct authority: applicant information. Atlas choice: organization support file and version links. A citation or attachment alone never establishes acceptance.
- Wording decision: Corrected: ask for addresses and citizenship as well as names.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## q-focd

- Current claim/question at baseline: Is the applicant owned, controlled, or dominated by an alien, foreign corporation, or foreign government?
- Baseline citation: 10 CFR § 53.1109(d)(3)(iii). Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: A. Statute or regulation.
- Exact support: 10 CFR § 53.1109(d)(3)(iii). Authority IDs: nrc-general.
- Applicability facts: license, focd, organization. Use only the represented project and the current facts below.
- Exceptions/missing facts: Entity form and any agency relationship determine the applicable paragraph of (d). Other application sections are outside the fourteen questions.
- Evidence: Applicant information and organization support. Direct authority: applicant information. Atlas choice: organization support file and version links. A citation or attachment alone never establishes acceptance.
- Wording decision: Retain bounded information question; add subsection, exceptions, source status and separate applicability.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## q-license

- Current claim/question at baseline: What license, facility use, license period, and related approvals are being requested?
- Baseline citation: 10 CFR § 53.1109(e). Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: A. Statute or regulation.
- Exact support: 10 CFR § 53.1109(e). Authority IDs: nrc-general.
- Applicability facts: license. Use only the represented project and the current facts below.
- Exceptions/missing facts: Entity form and any agency relationship determine the applicable paragraph of (d). Other application sections are outside the fourteen questions.
- Evidence: Applicant information and organization support. Direct authority: applicant information. Atlas choice: organization support file and version links. A citation or attachment alone never establishes acceptance.
- Wording decision: Retain bounded information question; add subsection, exceptions, source status and separate applicability.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## q-financial

- Current claim/question at baseline: How will the applicant demonstrate financial qualifications?
- Baseline citation: 10 CFR § 53.1413. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: A. Statute or regulation.
- Exact support: 10 CFR § 53.1413, introductory text and (a)–(b); 10 CFR § 53.1109(a)–(e). Authority IDs: nrc-finance, nrc-general.
- Applicability facts: license, financial. Use only the represented project and the current facts below.
- Exceptions/missing facts: Electric-utility status and the post-§ 53.1452 finding exception are not resolved by the intake.
- Evidence: Financial capacity plan, estimates and funding-source information; Atlas tracks a sample plan, not financial qualification. Direct authority: financial information described in § 53.1413. Atlas choice: the supplied preliminary plan and workflow review. A citation or attachment alone never establishes acceptance.
- Wording decision: Retain bounded information question; add subsection, exceptions, source status and separate applicability.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## q-safety

- Current claim/question at baseline: What safety analysis will support the application?
- Baseline citation: 10 CFR § 53.1416. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: A. Statute or regulation.
- Exact support: 10 CFR § 53.1416(a), introductory text. Authority IDs: nrc-safety.
- Applicability facts: license, safety. Use only the represented project and the current facts below.
- Exceptions/missing facts: Referenced design/site approvals and the full technical content are not assessed.
- Evidence: Controlled FSAR for actual application use; sample summary is preliminary. Direct authority: FSAR under § 53.1416(a). Atlas choice: retain a preliminary sample summary as evidence of work in progress, not a completed FSAR. A citation or attachment alone never establishes acceptance.
- Wording decision: Retain bounded information question; add subsection, exceptions, source status and separate applicability.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## q-environment

- Current claim/question at baseline: What environmental information will support the application?
- Baseline citation: 10 CFR § 53.1419. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: A. Statute or regulation.
- Exact support: 10 CFR § 53.1419(a)(1)(i)–(ii); 10 CFR § 51.50(c). Authority IDs: nrc-environment, nrc-environment-content.
- Applicability facts: license, environment. Use only the represented project and the current facts below.
- Exceptions/missing facts: Limited work authorization and referenced permit facts are missing; complete environmental content is outside scope.
- Evidence: Separate environmental report; sample outline does not establish its adequacy. Direct authority: environmental report under §§ 53.1419(a)(1) and 51.50(c). Atlas choice: retain the sample outline without treating it as adequate. A citation or attachment alone never establishes acceptance.
- Wording decision: Retain bounded information question; add subsection, exceptions, source status and separate applicability.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## q-eligibility

- Current claim/question at baseline: What legal eligibility review is required?
- Baseline citation: 10 CFR § 53.1118. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: H. Professional judgment or interpretation.
- Exact support: 10 CFR § 53.1118, introductory text and (a)–(b); 10 CFR § 53.1109(a)–(e); Atlas workflow v3. Authority IDs: nrc-eligibility, nrc-general, atlas-workflow.
- Applicability facts: license, eligibility. Use only the represented project and the current facts below.
- Exceptions/missing facts: Ownership/control facts, country conditions and any Commission determination remain unverified.
- Evidence: Qualified legal reasoning and ownership records. A legal-review memo is an Atlas evidence choice, not a prescribed document. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Clarified: retain conditional exception in § 53.1118(a)–(b); legal memo is Atlas evidence choice.
- Verification: verified provision within stated limits. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## q-evidence

- Current claim/question at baseline: Which controlled records support this application?
- Baseline citation: Atlas controlled-record contract. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: license, evidence. Use only the represented project and the current facts below.
- Exceptions/missing facts: No legal document-control contract is represented.
- Evidence: Section-to-record inventory. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Label explicitly as Atlas control; remove contract/statutory implication. No underlying industry standard is presumed binding.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## q-reviews

- Current claim/question at baseline: What reviews and open items remain?
- Baseline citation: Atlas review-control contract. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: license, reviews. Use only the represented project and the current facts below.
- Exceptions/missing facts: A review assignment is not an agency determination.
- Evidence: Responsible roles and open actions. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Label explicitly as Atlas control; remove contract/statutory implication. No underlying industry standard is presumed binding.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## q-history

- Current claim/question at baseline: What application history must remain traceable?
- Baseline citation: Atlas traceability contract. Baseline source keys: part53 = broad Part 53 reference (specialized sections selected for finance/safety/environment/eligibility); transportHrcq = § 173.403; transportEmergency = Part 172 Subpart G; atlasGovernance = Atlas control.
- Correct category: G. Atlas workflow control.
- Exact support: Atlas workflow v3. Authority IDs: atlas-workflow.
- Applicability facts: license, history. Use only the represented project and the current facts below.
- Exceptions/missing facts: Browser history is not production regulatory recordkeeping.
- Evidence: Prior versions and decisions. Atlas workflow choice: request a linked, versioned record to support the represented issue. File processing and citations never establish acceptance.
- Wording decision: Label explicitly as Atlas control; remove contract/statutory implication. No underlying industry standard is presumed binding.
- Verification: nonstatutory basis. Qualified-review boundary: Qualified reviewers must establish legal applicability, authenticity and sufficiency. Atlas establishes only the displayed bounded checks; simulated acceptance is not NRC acceptance, shipment authorization, supplier qualification or NQA-1 certification.

## Derived status and report inventory

All eighteen requirement findings (finding-<requirement ID>) reuse the associated record. Fourteen unresolved-answer findings (answer-<question ID>) use the question basis. Transportation governed finding uses trn-governed-review; supplier decision uses supplier-decision.

Evidence gap = no usable relevant linked record; conflict = mismatched/superseded evidence; review needed = evidence present pending qualified assessment; demo prerequisite represented = bounded scenario control; demo accepted = current simulated review for represented scope; stale = historical after change; changes requested/rejected = reviewer explanation. These are G workflow outputs. A recorded reviewer explanation is H professional judgment, with assumptions, evidence, original source snapshot and review status. None is an agency finding.

Next actions (load/attach/link/replace evidence, confirm answer, assign reviewer, retry evaluation, maintain reviewed version, re-review after change, download report) inherit the requirement or decision ID. Fourteen-question completion is an assembly milestone, not application completeness. Report executive status uses the same findings and decisions, with detailed mapping in supporting sections. Evidence filenames, hashes and versions are facts about browser processing; they do not establish legal sufficiency.

Detailed transportation-engine JSON is exposed only as Atlas workflow diagnostics with an explicit verification-pending warning. Its broader package/route/security/execution/maritime references are not adopted as verified legal conclusions. The legacy static routes redirect into these workspaces. No audit of dormant legacy engines or the entire regulatory universe is claimed.
