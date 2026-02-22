/* ========================================================================
   FHIR Resource Parser & Formatted View Renderer
   Supports NRCES FHIR R4 profiles (https://nrces.in/ndhm/fhir/r4/)
   ======================================================================== */

// ─── Parsing ────────────────────────────────────────────────────────────

export function parseJson(json, source = null) {
  const resources = [];
  const sourceInfo = source || { name: 'Unknown', id: Date.now().toString() };

  if (json.resourceType === 'Bundle' && json.entry) {
    json.entry.forEach((entry) => {
      if (entry.resource) resources.push(createResource(entry.resource, sourceInfo));
    });
  } else if (json.resourceType) {
    resources.push(createResource(json, sourceInfo));
  } else if (Array.isArray(json)) {
    json.forEach((item) => {
      if (item.resourceType) resources.push(createResource(item, sourceInfo));
    });
  }
  return resources;
}

function createResource(obj, source) {
  return {
    type: obj.resourceType || 'Unknown',
    id: obj.id || '(no id)',
    data: obj,
    source: source, // { name: 'filename.json', id: 'unique-id' }
    // lazy – computed once on first access
    get json() {
      const val = JSON.stringify(obj, null, 2);
      Object.defineProperty(this, 'json', { value: val });
      return val;
    },
  };
}

/**
 * Render JSON with syntax highlighting and clickable references.
 * Returns HTML string.
 */
export function renderJsonWithRefs(jsonString) {
  // Escape HTML first
  let html = escapeHtml(jsonString);

  // Highlight keys (property names)
  html = html.replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:');

  // Highlight strings, but make references clickable
  html = html.replace(/: "([^"]+)"/g, (match, value) => {
    // Check if this looks like a FHIR reference (ResourceType/id pattern or URL with resource)
    const isRef = /^[A-Z][a-zA-Z]+\/[a-zA-Z0-9\-\.]+$/.test(value) ||
                  /^(http|https):\/\/.*\/[A-Z][a-zA-Z]+\/[a-zA-Z0-9\-\.]+$/.test(value) ||
                  /^urn:uuid:[a-f0-9\-]+$/.test(value);

    // Check if this is a URL (for system fields etc.)
    const isUrl = /^(http|https):\/\//.test(value);

    if (isRef) {
      return `: <span class="json-string">"<button class="json-ref-link" data-ref="${escapeHtml(value)}" title="Navigate to ${escapeHtml(value)}">${escapeHtml(value)}</button>"</span>`;
    } else if (isUrl) {
      return `: <span class="json-string">"<a href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer" class="json-url-link" title="Open in new tab">${escapeHtml(value)}</a>"</span>`;
    } else {
      return `: <span class="json-string">"${escapeHtml(value)}"</span>`;
    }
  });

  // Highlight numbers
  html = html.replace(/: (-?\d+\.?\d*)(,?\n)/g, ': <span class="json-number">$1</span>$2');

  // Highlight booleans and null
  html = html.replace(/: (true|false|null)(,?\n)/g, ': <span class="json-boolean">$1</span>$2');

  return html;
}

// ─── Icons ──────────────────────────────────────────────────────────────

export function getResourceIcon(type) {
  const icons = {
    Patient: '👤', Practitioner: '👨‍⚕️', PractitionerRole: '🩻',
    Organization: '🏢', Observation: '📊', Procedure: '🏥',
    Medication: '💊', MedicationRequest: '📋', MedicationStatement: '📝',
    MedicationAdministration: '💉', Condition: '🩺', Bundle: '📦',
    Encounter: '🚪', DiagnosticReport: '📈', AllergyIntolerance: '⚠️',
    Immunization: '💉', Device: '⚙️', Composition: '📑',
    DocumentReference: '📎', Claim: '💰', ClaimResponse: '🧾',
    Coverage: '🛡️', ServiceRequest: '📨', Specimen: '🧪',
    CarePlan: '📅', CareTeam: '👥', Goal: '🎯',
    FamilyMemberHistory: '👨‍👩‍👧', RelatedPerson: '🤝', Location: '📍',
    HealthcareService: '🏨', Appointment: '📆', AppointmentResponse: '✅',
    Task: '✏️', Communication: '💬', Consent: '📜', Binary: '🔢',
  };
  return icons[type] || '📄';
}

// ─── Reference helpers ──────────────────────────────────────────────────

/**
 * Scan a FHIR resource and return all { reference, display } found.
 */
export function extractReferences(data) {
  const refs = [];
  walk(data, refs);
  return refs;
}

function walk(node, refs) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, refs)); return; }
  if (node.reference && typeof node.reference === 'string') {
    refs.push({ reference: node.reference, display: node.display || node.reference });
  }
  Object.values(node).forEach((v) => walk(v, refs));
}

/**
 * Render a FHIR reference as an HTML link button.
 * The class `ref-link` is picked up by ViewerPanel's click handler.
 */
function refLink(ref, display) {
  if (!ref) return '';
  const lbl = escapeHtml(display || ref);
  return `<button class="ref-link" data-ref="${escapeHtml(ref)}" title="Navigate to ${escapeHtml(ref)}">${lbl} →</button>`;
}

function renderRef(obj) {
  if (!obj) return '';
  if (obj.reference) return refLink(obj.reference, obj.display || obj.reference);
  if (obj.display) return escapeHtml(obj.display);
  return '';
}

// ─── Codeable helpers ───────────────────────────────────────────────────

function cc(codeable) {
  if (!codeable) return '';
  if (codeable.text) return escapeHtml(codeable.text);
  const c = codeable.coding?.[0];
  return c ? escapeHtml(c.display || c.code || '') : '';
}

function ccFull(codeable) {
  if (!codeable) return '';
  const parts = [];
  if (codeable.text) parts.push(escapeHtml(codeable.text));
  (codeable.coding || []).forEach((c) => {
    const disp = c.display || c.code || '';
    let sys = '';
    if (c.system) {
      // Make the system URL clickable if it's a valid URL
      if (c.system.startsWith('http://') || c.system.startsWith('https://')) {
        sys = ` <a href="${escapeHtml(c.system)}" target="_blank" rel="noopener noreferrer" class="coding-system-link" title="Open ${escapeHtml(c.system)} in new tab">(${escapeHtml(c.system)})</a>`;
      } else {
        sys = ` <span class="coding-system">(${escapeHtml(c.system)})</span>`;
      }
    }
    if (disp) parts.push(escapeHtml(disp) + sys);
  });
  return parts.join(' · ') || '';
}

function statusBadge(val, variant) {
  if (!val) return '';
  const cls = variant || badgeVariant(val);
  return `<span class="badge badge-${cls}">${escapeHtml(val)}</span>`;
}

function badgeVariant(val) {
  const v = (val || '').toLowerCase();
  if (['active', 'final', 'completed', 'confirmed', 'finished'].includes(v)) return 'success';
  if (['inactive', 'cancelled', 'entered-in-error', 'refuted'].includes(v)) return 'error';
  if (['draft', 'preliminary', 'unconfirmed', 'provisional'].includes(v)) return 'warning';
  return 'info';
}

function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; }
}

function fmtDateTime(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; }
}

function quantity(q) {
  if (!q) return '';
  const v = q.value ?? '';
  const u = q.unit || q.code || '';
  return `${v} ${escapeHtml(u)}`.trim();
}

function period(p) {
  if (!p) return '';
  const s = p.start ? fmtDateTime(p.start) : '?';
  const e = p.end ? fmtDateTime(p.end) : 'ongoing';
  return `${s} — ${e}`;
}

// ─── HTML building blocks ───────────────────────────────────────────────

function section(icon, title) { return `<div class="section"><div class="section-header">${icon} ${escapeHtml(title)}</div>`; }
function sectionEnd() { return '</div>'; }
function sub(title) { return `<div class="subsection"><div class="subsection-header">${title}</div>`; }
function subEnd() { return '</div>'; }
function row(label, value) {
  if (!value && value !== 0) return '';
  return `<div class="row"><span class="label">${escapeHtml(label)}:</span><span class="value">${value}</span></div>`;
}

// ─── Main dispatcher ────────────────────────────────────────────────────

const renderers = {
  Patient: renderPatient,
  Practitioner: renderPractitioner,
  PractitionerRole: renderPractitionerRole,
  Organization: renderOrganization,
  Observation: renderObservation,
  Condition: renderCondition,
  Medication: renderMedication,
  MedicationRequest: renderMedicationRequest,
  MedicationStatement: renderMedicationStatement,
  MedicationAdministration: renderMedicationAdministration,
  Encounter: renderEncounter,
  Procedure: renderProcedure,
  DiagnosticReport: renderDiagnosticReport,
  AllergyIntolerance: renderAllergyIntolerance,
  Immunization: renderImmunization,
  Composition: renderComposition,
  Claim: renderClaim,
  Coverage: renderCoverage,
  ServiceRequest: renderServiceRequest,
  DocumentReference: renderDocumentReference,
  CarePlan: renderCarePlan,
  CareTeam: renderCareTeam,
  Specimen: renderSpecimen,
  Goal: renderGoal,
  FamilyMemberHistory: renderFamilyMemberHistory,
  Appointment: renderAppointment,
  Location: renderLocation,
  Device: renderDevice,
};

export function renderFormattedView(resource) {
  const fn = renderers[resource.type];
  return fn ? fn(resource.data) : renderGeneric(resource.data);
}

// ─── Patient ────────────────────────────────────────────────────────────

function renderPatient(d) {
  const name = d.name?.[0];
  const nameStr = name ? (name.text || `${(name.prefix || []).join(' ')} ${(name.given || []).join(' ')} ${name.family || ''}`.trim()) : 'N/A';
  const age = calculateAge(d.birthDate);

  let h = section('👤', 'Patient Information');
  h += row('Name', escapeHtml(nameStr));
  h += row('ID', escapeHtml(d.id || 'N/A'));
  if (d.identifier?.length) {
    d.identifier.forEach((id) => {
      const sys = id.system ? `<span class="coding-system">(${escapeHtml(id.system)})</span>` : '';
      h += row('Identifier', `${escapeHtml(id.value || '')} ${sys}`);
    });
  }
  h += row('Birth Date', d.birthDate ? `${fmtDate(d.birthDate)} (Age: ${age})` : '');
  h += row('Gender', d.gender ? statusBadge(d.gender, 'info') : '');
  h += row('Marital Status', cc(d.maritalStatus));
  h += row('Deceased', d.deceasedBoolean === true ? statusBadge('Yes', 'error') : d.deceasedDateTime ? fmtDate(d.deceasedDateTime) : '');
  h += row('Multiple Birth', d.multipleBirthBoolean !== undefined ? String(d.multipleBirthBoolean) : d.multipleBirthInteger ? String(d.multipleBirthInteger) : '');

  // Managing Organization
  if (d.managingOrganization) h += row('Organization', renderRef(d.managingOrganization));
  // General Practitioner
  (d.generalPractitioner || []).forEach((gp) => { h += row('General Practitioner', renderRef(gp)); });

  // Telecom
  if (d.telecom?.length) {
    h += sub('📞 Telecom');
    d.telecom.forEach((t) => h += row(t.system || 'Contact', escapeHtml(t.value || '') + (t.use ? ` (${t.use})` : '')));
    h += subEnd();
  }

  // Address
  if (d.address?.length) {
    h += sub('📍 Address');
    d.address.forEach((a) => h += renderAddress(a));
    h += subEnd();
  }

  // Contact persons
  if (d.contact?.length) {
    h += sub('👥 Contact Persons');
    d.contact.forEach((c) => {
      const cn = c.name ? (c.name.text || `${(c.name.given || []).join(' ')} ${c.name.family || ''}`.trim()) : '';
      if (cn) h += row('Name', escapeHtml(cn));
      (c.relationship || []).forEach((r) => h += row('Relationship', cc(r)));
      (c.telecom || []).forEach((t) => h += row(t.system || 'Contact', escapeHtml(t.value || '')));
      if (c.address) h += renderAddress(c.address);
      if (c.organization) h += row('Organization', renderRef(c.organization));
    });
    h += subEnd();
  }

  // Communication
  if (d.communication?.length) {
    h += sub('🌐 Communication');
    d.communication.forEach((c) => {
      h += row('Language', cc(c.language));
      if (c.preferred) h += row('Preferred', statusBadge('Yes', 'success'));
    });
    h += subEnd();
  }

  // Links
  if (d.link?.length) {
    h += sub('🔗 Links');
    d.link.forEach((l) => { h += row(l.type || 'Link', renderRef(l.other)); });
    h += subEnd();
  }

  h += sectionEnd();
  return h;
}

// ─── Practitioner ───────────────────────────────────────────────────────

function renderPractitioner(d) {
  const name = d.name?.[0];
  const nameStr = name ? (name.text || `${(name.prefix || []).join(' ')} ${(name.given || []).join(' ')} ${name.family || ''}`.trim()) : 'N/A';

  let h = section('👨‍⚕️', 'Practitioner');
  h += row('Name', escapeHtml(nameStr));
  h += row('ID', escapeHtml(d.id || 'N/A'));
  h += row('Gender', d.gender ? statusBadge(d.gender, 'info') : '');
  h += row('Birth Date', fmtDate(d.birthDate));

  if (d.identifier?.length) {
    d.identifier.forEach((id) => h += row('Identifier', `${escapeHtml(id.value || '')} <span class="coding-system">(${escapeHtml(id.system || '')})</span>`));
  }

  if (d.telecom?.length) {
    h += sub('📞 Telecom');
    d.telecom.forEach((t) => h += row(t.system || 'Contact', escapeHtml(t.value || '') + (t.use ? ` (${t.use})` : '')));
    h += subEnd();
  }

  if (d.qualification?.length) {
    h += sub('🎓 Qualifications');
    d.qualification.forEach((q) => {
      h += row('Qualification', ccFull(q.code));
      if (q.period) h += row('Period', period(q.period));
      if (q.issuer) h += row('Issuer', renderRef(q.issuer));
    });
    h += subEnd();
  }

  if (d.address?.length) {
    h += sub('📍 Address');
    d.address.forEach((a) => h += renderAddress(a));
    h += subEnd();
  }

  h += sectionEnd();
  return h;
}

// ─── PractitionerRole ───────────────────────────────────────────────────

function renderPractitionerRole(d) {
  let h = section('🩻', 'Practitioner Role');
  h += row('ID', escapeHtml(d.id || 'N/A'));
  h += row('Active', d.active !== undefined ? statusBadge(String(d.active), d.active ? 'success' : 'error') : '');
  h += row('Practitioner', renderRef(d.practitioner));
  h += row('Organization', renderRef(d.organization));
  (d.code || []).forEach((c) => h += row('Role', ccFull(c)));
  (d.specialty || []).forEach((s) => h += row('Specialty', ccFull(s)));
  if (d.period) h += row('Period', period(d.period));
  (d.location || []).forEach((l) => h += row('Location', renderRef(l)));
  (d.healthcareService || []).forEach((s) => h += row('Service', renderRef(s)));
  h += sectionEnd();
  return h;
}

// ─── Organization ───────────────────────────────────────────────────────

function renderOrganization(d) {
  let h = section('🏢', 'Organization');
  h += row('Name', escapeHtml(d.name || ''));
  h += row('ID', escapeHtml(d.id || 'N/A'));
  h += row('Active', d.active !== undefined ? statusBadge(String(d.active), d.active ? 'success' : 'error') : '');
  (d.type || []).forEach((t) => h += row('Type', ccFull(t)));
  (d.identifier || []).forEach((id) => h += row('Identifier', `${escapeHtml(id.value || '')} <span class="coding-system">(${escapeHtml(id.system || '')})</span>`));
  h += row('Part Of', renderRef(d.partOf));

  if (d.telecom?.length) {
    h += sub('📞 Telecom');
    d.telecom.forEach((t) => h += row(t.system || 'Contact', escapeHtml(t.value || '')));
    h += subEnd();
  }
  if (d.address?.length) {
    h += sub('📍 Address');
    d.address.forEach((a) => h += renderAddress(a));
    h += subEnd();
  }

  h += sectionEnd();
  return h;
}

// ─── Observation ────────────────────────────────────────────────────────

function renderObservation(d) {
  let h = section('📊', 'Observation');
  h += row('Code', ccFull(d.code));
  h += row('Status', statusBadge(d.status));
  (d.category || []).forEach((c) => h += row('Category', ccFull(c)));

  // Value[x]
  if (d.valueQuantity) h += row('Value', quantity(d.valueQuantity));
  else if (d.valueString) h += row('Value', escapeHtml(d.valueString));
  else if (d.valueCodeableConcept) h += row('Value', ccFull(d.valueCodeableConcept));
  else if (d.valueBoolean !== undefined) h += row('Value', String(d.valueBoolean));
  else if (d.valueInteger !== undefined) h += row('Value', String(d.valueInteger));
  else if (d.valueRange) h += row('Value', `${quantity(d.valueRange.low)} – ${quantity(d.valueRange.high)}`);
  else if (d.valuePeriod) h += row('Value', period(d.valuePeriod));
  else if (d.valueDateTime) h += row('Value', fmtDateTime(d.valueDateTime));
  else if (d.valueSampledData) h += row('Value', 'SampledData');

  // Data absent reason
  if (d.dataAbsentReason) h += row('Data Absent Reason', ccFull(d.dataAbsentReason));

  h += row('Effective', d.effectiveDateTime ? fmtDateTime(d.effectiveDateTime) : d.effectivePeriod ? period(d.effectivePeriod) : '');
  h += row('Issued', fmtDateTime(d.issued));
  h += row('Subject', renderRef(d.subject));
  (d.performer || []).forEach((p) => h += row('Performer', renderRef(p)));
  h += row('Encounter', renderRef(d.encounter));

  // Interpretation
  (d.interpretation || []).forEach((i) => h += row('Interpretation', ccFull(i)));

  // Body site & method
  h += row('Body Site', ccFull(d.bodySite));
  h += row('Method', ccFull(d.method));
  h += row('Specimen', renderRef(d.specimen));
  h += row('Device', renderRef(d.device));

  // Reference range
  if (d.referenceRange?.length) {
    h += sub('📏 Reference Range');
    d.referenceRange.forEach((rr) => {
      const low = quantity(rr.low);
      const high = quantity(rr.high);
      h += row('Range', `${low || '?'} – ${high || '?'}`);
      h += row('Type', ccFull(rr.type));
      h += row('Text', escapeHtml(rr.text || ''));
    });
    h += subEnd();
  }

  // Components
  if (d.component?.length) {
    h += sub('🧩 Components');
    d.component.forEach((comp) => {
      h += row('Component', ccFull(comp.code));
      if (comp.valueQuantity) h += row('Value', quantity(comp.valueQuantity));
      else if (comp.valueString) h += row('Value', escapeHtml(comp.valueString));
      else if (comp.valueCodeableConcept) h += row('Value', ccFull(comp.valueCodeableConcept));
      if (comp.referenceRange?.length) {
        comp.referenceRange.forEach((rr) => h += row('Ref Range', `${quantity(rr.low)} – ${quantity(rr.high)}`));
      }
    });
    h += subEnd();
  }

  // Notes
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));

  // Has member / derived from
  (d.hasMember || []).forEach((m) => h += row('Has Member', renderRef(m)));
  (d.derivedFrom || []).forEach((m) => h += row('Derived From', renderRef(m)));

  h += sectionEnd();
  return h;
}

// ─── Condition ──────────────────────────────────────────────────────────

function renderCondition(d) {
  let h = section('🩺', 'Condition');
  h += row('Condition', ccFull(d.code));
  h += row('Clinical Status', d.clinicalStatus ? statusBadge(d.clinicalStatus.coding?.[0]?.code || cc(d.clinicalStatus)) : '');
  h += row('Verification', d.verificationStatus ? statusBadge(d.verificationStatus.coding?.[0]?.code || cc(d.verificationStatus)) : '');
  (d.category || []).forEach((c) => h += row('Category', ccFull(c)));
  h += row('Severity', ccFull(d.severity));
  h += row('Body Site', ccFull(d.bodySite?.[0]));
  h += row('Subject', renderRef(d.subject));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Asserter', renderRef(d.asserter));
  h += row('Recorder', renderRef(d.recorder));

  // Onset & abatement
  h += row('Onset', d.onsetDateTime ? fmtDate(d.onsetDateTime) : d.onsetAge ? quantity(d.onsetAge) : d.onsetPeriod ? period(d.onsetPeriod) : d.onsetString || '');
  h += row('Abatement', d.abatementDateTime ? fmtDate(d.abatementDateTime) : d.abatementAge ? quantity(d.abatementAge) : d.abatementString || '');
  h += row('Recorded Date', fmtDate(d.recordedDate));

  // Stage
  (d.stage || []).forEach((s) => {
    h += row('Stage', ccFull(s.summary));
    h += row('Stage Type', ccFull(s.type));
    (s.assessment || []).forEach((a) => h += row('Assessment', renderRef(a)));
  });

  // Evidence
  (d.evidence || []).forEach((e) => {
    (e.code || []).forEach((c) => h += row('Evidence Code', ccFull(c)));
    (e.detail || []).forEach((det) => h += row('Evidence Detail', renderRef(det)));
  });

  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));

  h += sectionEnd();
  return h;
}

// ─── Medication ─────────────────────────────────────────────────────────

function renderMedication(d) {
  let h = section('💊', 'Medication');
  h += row('Medication', ccFull(d.code));
  h += row('Status', statusBadge(d.status));
  h += row('Form', ccFull(d.form));
  if (d.amount) h += row('Amount', `${quantity(d.amount.numerator)} / ${quantity(d.amount.denominator)}`);
  h += row('Manufacturer', renderRef(d.manufacturer));
  if (d.batch) {
    h += row('Batch Lot', escapeHtml(d.batch.lotNumber || ''));
    h += row('Batch Expiry', fmtDate(d.batch.expirationDate));
  }

  if (d.ingredient?.length) {
    h += sub('🧪 Ingredients');
    d.ingredient.forEach((ing) => {
      const name = ing.itemCodeableConcept ? ccFull(ing.itemCodeableConcept) : ing.item?.concept ? ccFull(ing.item.concept) : renderRef(ing.itemReference || ing.item?.reference);
      h += row('Item', name);
      if (ing.isActive !== undefined) h += row('Active', statusBadge(String(ing.isActive), ing.isActive ? 'success' : 'warning'));
      if (ing.strength) h += row('Strength', `${quantity(ing.strength.numerator)} / ${quantity(ing.strength.denominator)}`);
    });
    h += subEnd();
  }

  h += sectionEnd();
  return h;
}

// ─── MedicationRequest ──────────────────────────────────────────────────

function renderMedicationRequest(d) {
  let h = section('📋', 'Medication Request');
  h += row('Status', statusBadge(d.status));
  h += row('Intent', statusBadge(d.intent, 'info'));
  h += row('Priority', d.priority ? statusBadge(d.priority) : '');
  h += row('Medication', d.medicationCodeableConcept ? ccFull(d.medicationCodeableConcept) : renderRef(d.medicationReference));
  h += row('Subject', renderRef(d.subject));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Requester', renderRef(d.requester));
  h += row('Recorder', renderRef(d.recorder));
  h += row('Authored On', fmtDateTime(d.authoredOn));
  (d.reasonCode || []).forEach((c) => h += row('Reason', ccFull(c)));
  (d.reasonReference || []).forEach((r) => h += row('Reason Ref', renderRef(r)));
  (d.basedOn || []).forEach((b) => h += row('Based On', renderRef(b)));
  (d.insurance || []).forEach((i) => h += row('Insurance', renderRef(i)));

  if (d.dosageInstruction?.length) {
    h += sub('💊 Dosage');
    d.dosageInstruction.forEach((dos) => {
      h += row('Text', escapeHtml(dos.text || ''));
      h += row('Route', ccFull(dos.route));
      h += row('Method', ccFull(dos.method));
      h += row('Site', ccFull(dos.site));
      if (dos.timing?.repeat) {
        const r = dos.timing.repeat;
        h += row('Frequency', `${r.frequency || '?'}x per ${r.period || '?'} ${r.periodUnit || ''}`);
        h += row('Duration', r.duration ? `${r.duration} ${r.durationUnit || ''}` : '');
      }
      if (dos.doseAndRate?.length) {
        dos.doseAndRate.forEach((dr) => {
          h += row('Dose', quantity(dr.doseQuantity) || (dr.doseRange ? `${quantity(dr.doseRange.low)} – ${quantity(dr.doseRange.high)}` : ''));
        });
      }
    });
    h += subEnd();
  }

  if (d.dispenseRequest) {
    h += sub('📦 Dispense Request');
    h += row('Quantity', quantity(d.dispenseRequest.quantity));
    h += row('Supply Duration', quantity(d.dispenseRequest.expectedSupplyDuration));
    h += row('Refills', d.dispenseRequest.numberOfRepeatsAllowed !== undefined ? String(d.dispenseRequest.numberOfRepeatsAllowed) : '');
    h += row('Validity', d.dispenseRequest.validityPeriod ? period(d.dispenseRequest.validityPeriod) : '');
    h += row('Performer', renderRef(d.dispenseRequest.performer));
    h += subEnd();
  }

  if (d.substitution) {
    h += row('Substitution Allowed', d.substitution.allowedBoolean !== undefined ? String(d.substitution.allowedBoolean) : ccFull(d.substitution.allowedCodeableConcept));
    h += row('Substitution Reason', ccFull(d.substitution.reason));
  }

  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

// ─── MedicationStatement ────────────────────────────────────────────────

function renderMedicationStatement(d) {
  let h = section('📝', 'Medication Statement');
  h += row('Status', statusBadge(d.status));
  h += row('Medication', d.medicationCodeableConcept ? ccFull(d.medicationCodeableConcept) : renderRef(d.medicationReference));
  h += row('Subject', renderRef(d.subject));
  h += row('Context', renderRef(d.context));
  h += row('Effective', d.effectiveDateTime ? fmtDateTime(d.effectiveDateTime) : d.effectivePeriod ? period(d.effectivePeriod) : '');
  h += row('Date Asserted', fmtDate(d.dateAsserted));
  h += row('Information Source', renderRef(d.informationSource));
  (d.reasonCode || []).forEach((c) => h += row('Reason', ccFull(c)));
  (d.reasonReference || []).forEach((r) => h += row('Reason Ref', renderRef(r)));
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

// ─── MedicationAdministration ───────────────────────────────────────────

function renderMedicationAdministration(d) {
  let h = section('💉', 'Medication Administration');
  h += row('Status', statusBadge(d.status));
  h += row('Medication', d.medicationCodeableConcept ? ccFull(d.medicationCodeableConcept) : renderRef(d.medicationReference));
  h += row('Subject', renderRef(d.subject));
  h += row('Context', renderRef(d.context));
  h += row('Effective', d.effectiveDateTime ? fmtDateTime(d.effectiveDateTime) : d.effectivePeriod ? period(d.effectivePeriod) : '');
  (d.performer || []).forEach((p) => { h += row('Performer', renderRef(p.actor)); });
  h += row('Request', renderRef(d.request));
  if (d.dosage) {
    h += row('Dose', quantity(d.dosage.dose));
    h += row('Route', ccFull(d.dosage.route));
    h += row('Site', ccFull(d.dosage.site));
    h += row('Rate', quantity(d.dosage.rateQuantity));
  }
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

// ─── Encounter ──────────────────────────────────────────────────────────

function renderEncounter(d) {
  let h = section('🚪', 'Encounter');
  h += row('Status', statusBadge(d.status));
  h += row('Class', d.class?.display || d.class?.code ? escapeHtml(d.class.display || d.class.code) : '');
  (d.type || []).forEach((t) => h += row('Type', ccFull(t)));
  h += row('Priority', ccFull(d.priority));
  h += row('Subject', renderRef(d.subject));
  h += row('Period', period(d.period));
  h += row('Service Provider', renderRef(d.serviceProvider));
  (d.participant || []).forEach((p) => {
    (p.type || []).forEach((t) => h += row('Participant Type', ccFull(t)));
    h += row('Participant', renderRef(p.individual));
    if (p.period) h += row('Participant Period', period(p.period));
  });
  (d.reasonCode || []).forEach((c) => h += row('Reason', ccFull(c)));
  (d.reasonReference || []).forEach((r) => h += row('Reason Ref', renderRef(r)));
  (d.diagnosis || []).forEach((diag) => {
    h += row('Diagnosis', renderRef(diag.condition));
    h += row('Use', ccFull(diag.use));
  });
  if (d.hospitalization) {
    h += sub('🏥 Hospitalization');
    h += row('Admit Source', ccFull(d.hospitalization.admitSource));
    h += row('Discharge', ccFull(d.hospitalization.dischargeDisposition));
    h += row('Re-admission', ccFull(d.hospitalization.reAdmission));
    h += subEnd();
  }
  (d.location || []).forEach((l) => h += row('Location', renderRef(l.location)));
  h += sectionEnd();
  return h;
}

// ─── Procedure ──────────────────────────────────────────────────────────

function renderProcedure(d) {
  let h = section('🏥', 'Procedure');
  h += row('Status', statusBadge(d.status));
  h += row('Code', ccFull(d.code));
  (d.category || []).forEach ? (d.category instanceof Array ? d.category : [d.category]).forEach((c) => h += row('Category', ccFull(c))) : '';
  h += row('Subject', renderRef(d.subject));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Performed', d.performedDateTime ? fmtDateTime(d.performedDateTime) : d.performedPeriod ? period(d.performedPeriod) : d.performedString || '');
  h += row('Recorder', renderRef(d.recorder));
  h += row('Asserter', renderRef(d.asserter));
  (d.performer || []).forEach((p) => {
    h += row('Performer', renderRef(p.actor));
    h += row('Role', ccFull(p.function));
    h += row('On Behalf Of', renderRef(p.onBehalfOf));
  });
  (d.reasonCode || []).forEach((c) => h += row('Reason', ccFull(c)));
  (d.reasonReference || []).forEach((r) => h += row('Reason Ref', renderRef(r)));
  (d.bodySite || []).forEach((b) => h += row('Body Site', ccFull(b)));
  h += row('Outcome', ccFull(d.outcome));
  (d.complication || []).forEach((c) => h += row('Complication', ccFull(c)));
  (d.followUp || []).forEach((f) => h += row('Follow Up', ccFull(f)));
  (d.report || []).forEach((r) => h += row('Report', renderRef(r)));
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

// ─── DiagnosticReport ───────────────────────────────────────────────────

function renderDiagnosticReport(d) {
  let h = section('📈', 'Diagnostic Report');
  h += row('Status', statusBadge(d.status));
  h += row('Code', ccFull(d.code));
  (d.category || []).forEach((c) => h += row('Category', ccFull(c)));
  h += row('Subject', renderRef(d.subject));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Effective', d.effectiveDateTime ? fmtDateTime(d.effectiveDateTime) : d.effectivePeriod ? period(d.effectivePeriod) : '');
  h += row('Issued', fmtDateTime(d.issued));
  (d.performer || []).forEach((p) => h += row('Performer', renderRef(p)));
  (d.resultsInterpreter || []).forEach((r) => h += row('Interpreter', renderRef(r)));
  (d.specimen || []).forEach((s) => h += row('Specimen', renderRef(s)));
  (d.result || []).forEach((r) => h += row('Result', renderRef(r)));
  (d.imagingStudy || []).forEach((i) => h += row('Imaging Study', renderRef(i)));
  h += row('Conclusion', escapeHtml(d.conclusion || ''));
  (d.conclusionCode || []).forEach((c) => h += row('Conclusion Code', ccFull(c)));
  (d.basedOn || []).forEach((b) => h += row('Based On', renderRef(b)));
  h += sectionEnd();
  return h;
}

// ─── AllergyIntolerance ─────────────────────────────────────────────────

function renderAllergyIntolerance(d) {
  let h = section('⚠️', 'Allergy / Intolerance');
  h += row('Substance', ccFull(d.code));
  h += row('Clinical Status', d.clinicalStatus ? statusBadge(d.clinicalStatus.coding?.[0]?.code || cc(d.clinicalStatus)) : '');
  h += row('Verification', d.verificationStatus ? statusBadge(d.verificationStatus.coding?.[0]?.code || cc(d.verificationStatus)) : '');
  h += row('Type', d.type ? statusBadge(d.type, 'info') : '');
  (d.category || []).forEach((c) => h += row('Category', statusBadge(c, 'info')));
  h += row('Criticality', d.criticality ? statusBadge(d.criticality, d.criticality === 'high' ? 'error' : 'warning') : '');
  h += row('Patient', renderRef(d.patient));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Asserter', renderRef(d.asserter));
  h += row('Recorder', renderRef(d.recorder));
  h += row('Onset', d.onsetDateTime ? fmtDate(d.onsetDateTime) : d.onsetAge ? quantity(d.onsetAge) : d.onsetString || '');
  h += row('Recorded Date', fmtDate(d.recordedDate));
  h += row('Last Occurrence', fmtDate(d.lastOccurrence));

  if (d.reaction?.length) {
    h += sub('🔴 Reactions');
    d.reaction.forEach((r) => {
      h += row('Substance', ccFull(r.substance));
      (r.manifestation || []).forEach((m) => h += row('Manifestation', ccFull(m)));
      h += row('Severity', r.severity ? statusBadge(r.severity, r.severity === 'severe' ? 'error' : 'warning') : '');
      h += row('Description', escapeHtml(r.description || ''));
      h += row('Onset', fmtDateTime(r.onset));
      h += row('Exposure Route', ccFull(r.exposureRoute));
    });
    h += subEnd();
  }

  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

// ─── Immunization ───────────────────────────────────────────────────────

function renderImmunization(d) {
  let h = section('💉', 'Immunization');
  h += row('Status', statusBadge(d.status));
  h += row('Vaccine', ccFull(d.vaccineCode));
  h += row('Patient', renderRef(d.patient));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Occurrence', d.occurrenceDateTime ? fmtDateTime(d.occurrenceDateTime) : d.occurrenceString || '');
  h += row('Recorded', fmtDate(d.recorded));
  h += row('Primary Source', d.primarySource !== undefined ? String(d.primarySource) : '');
  h += row('Lot Number', escapeHtml(d.lotNumber || ''));
  h += row('Expiration', fmtDate(d.expirationDate));
  h += row('Site', ccFull(d.site));
  h += row('Route', ccFull(d.route));
  h += row('Dose', quantity(d.doseQuantity));
  h += row('Manufacturer', renderRef(d.manufacturer));
  h += row('Location', renderRef(d.location));
  (d.performer || []).forEach((p) => { h += row('Performer', renderRef(p.actor)); h += row('Function', ccFull(p.function)); });
  (d.reasonCode || []).forEach((c) => h += row('Reason', ccFull(c)));
  (d.reasonReference || []).forEach((r) => h += row('Reason Ref', renderRef(r)));
  h += row('Status Reason', ccFull(d.statusReason));
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));

  if (d.protocolApplied?.length) {
    h += sub('📋 Protocol');
    d.protocolApplied.forEach((p) => {
      h += row('Series', escapeHtml(p.series || ''));
      h += row('Dose #', p.doseNumberPositiveInt !== undefined ? String(p.doseNumberPositiveInt) : p.doseNumberString || '');
      h += row('Series Doses', p.seriesDosesPositiveInt !== undefined ? String(p.seriesDosesPositiveInt) : p.seriesDosesString || '');
      h += row('Authority', renderRef(p.authority));
      (p.targetDisease || []).forEach((t) => h += row('Target Disease', ccFull(t)));
    });
    h += subEnd();
  }

  h += sectionEnd();
  return h;
}

// ─── Composition ────────────────────────────────────────────────────────

function renderComposition(d) {
  let h = section('📑', 'Composition');
  h += row('Status', statusBadge(d.status));
  h += row('Type', ccFull(d.type));
  (d.category || []).forEach((c) => h += row('Category', ccFull(c)));
  h += row('Title', escapeHtml(d.title || ''));
  h += row('Date', fmtDateTime(d.date));
  h += row('Subject', renderRef(d.subject));
  h += row('Encounter', renderRef(d.encounter));
  (d.author || []).forEach((a) => h += row('Author', renderRef(a)));
  h += row('Custodian', renderRef(d.custodian));
  h += row('Confidentiality', d.confidentiality || '');

  if (d.section?.length) {
    h += sub('📄 Sections');
    d.section.forEach((s) => {
      h += row('Section', escapeHtml(s.title || cc(s.code) || 'Untitled'));
      if (s.text?.div) h += row('Content', s.text.div);
      (s.entry || []).forEach((e) => h += row('Entry', renderRef(e)));
    });
    h += subEnd();
  }

  (d.attester || []).forEach((a) => { h += row('Attester', renderRef(a.party)); h += row('Mode', a.mode || ''); });
  (d.event || []).forEach((e) => { (e.code || []).forEach((c) => h += row('Event', ccFull(c))); if (e.period) h += row('Event Period', period(e.period)); });

  h += sectionEnd();
  return h;
}

// ─── Claim ──────────────────────────────────────────────────────────────

function renderClaim(d) {
  let h = section('💰', 'Claim');
  h += row('Status', statusBadge(d.status));
  h += row('Type', ccFull(d.type));
  h += row('Sub-Type', ccFull(d.subType));
  h += row('Use', statusBadge(d.use, 'info'));
  h += row('Patient', renderRef(d.patient));
  h += row('Provider', renderRef(d.provider));
  h += row('Insurer', renderRef(d.insurer));
  h += row('Priority', ccFull(d.priority));
  h += row('Created', fmtDate(d.created));
  h += row('Billable Period', d.billablePeriod ? period(d.billablePeriod) : '');
  if (d.total) h += row('Total', quantity(d.total));

  if (d.diagnosis?.length) {
    h += sub('🩺 Diagnoses');
    d.diagnosis.forEach((diag) => {
      h += row(`#${diag.sequence || '?'}`, ccFull(diag.diagnosisCodeableConcept) || renderRef(diag.diagnosisReference));
      (diag.type || []).forEach((t) => h += row('Type', ccFull(t)));
    });
    h += subEnd();
  }

  if (d.item?.length) {
    h += sub('📦 Items');
    d.item.forEach((item) => {
      h += row(`#${item.sequence || '?'}`, ccFull(item.productOrService));
      if (item.quantity) h += row('Quantity', quantity(item.quantity));
      if (item.unitPrice) h += row('Unit Price', quantity(item.unitPrice));
      if (item.net) h += row('Net', quantity(item.net));
    });
    h += subEnd();
  }

  (d.insurance || []).forEach((ins) => { h += row('Insurance', renderRef(ins.coverage)); h += row('Focal', ins.focal !== undefined ? String(ins.focal) : ''); });
  h += sectionEnd();
  return h;
}

// ─── Coverage ───────────────────────────────────────────────────────────

function renderCoverage(d) {
  let h = section('🛡️', 'Coverage');
  h += row('Status', statusBadge(d.status));
  h += row('Type', ccFull(d.type));
  h += row('Subscriber', renderRef(d.subscriber));
  h += row('Subscriber ID', escapeHtml(d.subscriberId || ''));
  h += row('Beneficiary', renderRef(d.beneficiary));
  h += row('Relationship', ccFull(d.relationship));
  h += row('Period', d.period ? period(d.period) : '');
  (d.payor || []).forEach((p) => h += row('Payor', renderRef(p)));
  h += row('Dependent', escapeHtml(d.dependent || ''));
  h += row('Order', d.order !== undefined ? String(d.order) : '');
  if (d.class?.length) {
    h += sub('📋 Classes');
    d.class.forEach((c) => { h += row(ccFull(c.type) || 'Class', escapeHtml(c.value || '') + (c.name ? ` (${escapeHtml(c.name)})` : '')); });
    h += subEnd();
  }
  h += sectionEnd();
  return h;
}

// ─── ServiceRequest ─────────────────────────────────────────────────────

function renderServiceRequest(d) {
  let h = section('📨', 'Service Request');
  h += row('Status', statusBadge(d.status));
  h += row('Intent', statusBadge(d.intent, 'info'));
  h += row('Priority', d.priority ? statusBadge(d.priority) : '');
  h += row('Code', ccFull(d.code));
  (d.category || []).forEach((c) => h += row('Category', ccFull(c)));
  h += row('Subject', renderRef(d.subject));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Requester', renderRef(d.requester));
  (d.performer || []).forEach((p) => h += row('Performer', renderRef(p)));
  h += row('Occurrence', d.occurrenceDateTime ? fmtDateTime(d.occurrenceDateTime) : d.occurrencePeriod ? period(d.occurrencePeriod) : '');
  h += row('Authored On', fmtDateTime(d.authoredOn));
  (d.reasonCode || []).forEach((c) => h += row('Reason', ccFull(c)));
  (d.reasonReference || []).forEach((r) => h += row('Reason Ref', renderRef(r)));
  (d.bodySite || []).forEach((b) => h += row('Body Site', ccFull(b)));
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

// ─── DocumentReference ──────────────────────────────────────────────────

function renderDocumentReference(d) {
  let h = section('📎', 'Document Reference');
  h += row('Status', statusBadge(d.status));
  h += row('Doc Status', d.docStatus ? statusBadge(d.docStatus) : '');
  h += row('Type', ccFull(d.type));
  (d.category || []).forEach((c) => h += row('Category', ccFull(c)));
  h += row('Subject', renderRef(d.subject));
  h += row('Date', fmtDateTime(d.date));
  (d.author || []).forEach((a) => h += row('Author', renderRef(a)));
  h += row('Custodian', renderRef(d.custodian));
  h += row('Authenticator', renderRef(d.authenticator));
  h += row('Description', escapeHtml(d.description || ''));
  if (d.content?.length) {
    h += sub('📄 Content');
    d.content.forEach((c) => {
      if (c.attachment) {
        h += row('Content Type', escapeHtml(c.attachment.contentType || ''));
        h += row('Title', escapeHtml(c.attachment.title || ''));
        h += row('Size', c.attachment.size ? `${c.attachment.size} bytes` : '');
        h += row('Created', fmtDateTime(c.attachment.creation));
        if (c.attachment.url) h += row('URL', escapeHtml(c.attachment.url));
      }
      if (c.format) h += row('Format', escapeHtml(c.format.display || c.format.code || ''));
    });
    h += subEnd();
  }
  if (d.context) {
    (d.context.encounter || []).forEach((e) => h += row('Encounter', renderRef(e)));
    h += row('Facility Type', ccFull(d.context.facilityType));
    h += row('Practice Setting', ccFull(d.context.practiceSetting));
    if (d.context.period) h += row('Period', period(d.context.period));
  }
  h += sectionEnd();
  return h;
}

// ─── CarePlan ───────────────────────────────────────────────────────────

function renderCarePlan(d) {
  let h = section('📅', 'Care Plan');
  h += row('Status', statusBadge(d.status));
  h += row('Intent', statusBadge(d.intent, 'info'));
  h += row('Title', escapeHtml(d.title || ''));
  h += row('Description', escapeHtml(d.description || ''));
  h += row('Subject', renderRef(d.subject));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Period', d.period ? period(d.period) : '');
  (d.author || []).forEach ? (Array.isArray(d.author) ? d.author : [d.author]).forEach((a) => h += row('Author', renderRef(a))) : '';
  (d.category || []).forEach((c) => h += row('Category', ccFull(c)));
  (d.careTeam || []).forEach((ct) => h += row('Care Team', renderRef(ct)));
  (d.goal || []).forEach((g) => h += row('Goal', renderRef(g)));
  (d.activity || []).forEach((act) => {
    if (act.reference) h += row('Activity Ref', renderRef(act.reference));
    if (act.detail) {
      h += row('Activity', ccFull(act.detail.code));
      h += row('Activity Status', statusBadge(act.detail.status));
    }
  });
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

// ─── CareTeam ───────────────────────────────────────────────────────────

function renderCareTeam(d) {
  let h = section('👥', 'Care Team');
  h += row('Status', statusBadge(d.status));
  h += row('Name', escapeHtml(d.name || ''));
  h += row('Subject', renderRef(d.subject));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Period', d.period ? period(d.period) : '');
  (d.category || []).forEach((c) => h += row('Category', ccFull(c)));
  if (d.participant?.length) {
    h += sub('👥 Participants');
    d.participant.forEach((p) => {
      (p.role || []).forEach((r) => h += row('Role', ccFull(r)));
      h += row('Member', renderRef(p.member));
      h += row('On Behalf Of', renderRef(p.onBehalfOf));
      if (p.period) h += row('Period', period(p.period));
    });
    h += subEnd();
  }
  (d.managingOrganization || []).forEach((o) => h += row('Managing Org', renderRef(o)));
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

// ─── Specimen ───────────────────────────────────────────────────────────

function renderSpecimen(d) {
  let h = section('🧪', 'Specimen');
  h += row('Status', statusBadge(d.status));
  h += row('Type', ccFull(d.type));
  h += row('Subject', renderRef(d.subject));
  h += row('Received', fmtDateTime(d.receivedTime));
  if (d.collection) {
    h += row('Collector', renderRef(d.collection.collector));
    h += row('Collected', d.collection.collectedDateTime ? fmtDateTime(d.collection.collectedDateTime) : d.collection.collectedPeriod ? period(d.collection.collectedPeriod) : '');
    h += row('Quantity', quantity(d.collection.quantity));
    h += row('Body Site', ccFull(d.collection.bodySite));
    h += row('Method', ccFull(d.collection.method));
  }
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

// ─── Goal ───────────────────────────────────────────────────────────────

function renderGoal(d) {
  let h = section('🎯', 'Goal');
  h += row('Lifecycle Status', statusBadge(d.lifecycleStatus));
  h += row('Achievement', ccFull(d.achievementStatus));
  h += row('Description', ccFull(d.description));
  h += row('Subject', renderRef(d.subject));
  h += row('Start Date', fmtDate(d.startDate));
  (d.target || []).forEach((t) => {
    h += row('Target Measure', ccFull(t.measure));
    h += row('Target Detail', t.detailQuantity ? quantity(t.detailQuantity) : t.detailString || '');
    h += row('Due Date', fmtDate(t.dueDate));
  });
  (d.category || []).forEach((c) => h += row('Category', ccFull(c)));
  h += row('Priority', ccFull(d.priority));
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

// ─── FamilyMemberHistory ────────────────────────────────────────────────

function renderFamilyMemberHistory(d) {
  let h = section('👨‍👩‍👧', 'Family Member History');
  h += row('Status', statusBadge(d.status));
  h += row('Patient', renderRef(d.patient));
  h += row('Name', escapeHtml(d.name || ''));
  h += row('Relationship', ccFull(d.relationship));
  h += row('Sex', ccFull(d.sex));
  h += row('Born', d.bornDate ? fmtDate(d.bornDate) : d.bornString || '');
  h += row('Age', d.ageAge ? quantity(d.ageAge) : d.ageString || '');
  h += row('Deceased', d.deceasedBoolean !== undefined ? String(d.deceasedBoolean) : d.deceasedDate ? fmtDate(d.deceasedDate) : d.deceasedAge ? quantity(d.deceasedAge) : '');
  (d.condition || []).forEach((c) => {
    h += row('Condition', ccFull(c.code));
    h += row('Outcome', ccFull(c.outcome));
    h += row('Onset', c.onsetAge ? quantity(c.onsetAge) : c.onsetString || '');
  });
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

// ─── Appointment ────────────────────────────────────────────────────────

function renderAppointment(d) {
  let h = section('📆', 'Appointment');
  h += row('Status', statusBadge(d.status));
  h += row('Service Category', ccFull(d.serviceCategory?.[0]));
  (d.serviceType || []).forEach((s) => h += row('Service Type', ccFull(s)));
  (d.specialty || []).forEach((s) => h += row('Specialty', ccFull(s)));
  h += row('Appointment Type', ccFull(d.appointmentType));
  (d.reasonCode || []).forEach((c) => h += row('Reason', ccFull(c)));
  (d.reasonReference || []).forEach((r) => h += row('Reason Ref', renderRef(r)));
  h += row('Priority', d.priority !== undefined ? String(d.priority) : '');
  h += row('Description', escapeHtml(d.description || ''));
  h += row('Start', fmtDateTime(d.start));
  h += row('End', fmtDateTime(d.end));
  h += row('Duration', d.minutesDuration ? `${d.minutesDuration} min` : '');
  if (d.participant?.length) {
    h += sub('👥 Participants');
    d.participant.forEach((p) => {
      h += row('Actor', renderRef(p.actor));
      h += row('Status', statusBadge(p.status));
      (p.type || []).forEach((t) => h += row('Type', ccFull(t)));
    });
    h += subEnd();
  }
  (d.basedOn || []).forEach((b) => h += row('Based On', renderRef(b)));
  h += sectionEnd();
  return h;
}

// ─── Location ───────────────────────────────────────────────────────────

function renderLocation(d) {
  let h = section('📍', 'Location');
  h += row('Status', statusBadge(d.status));
  h += row('Name', escapeHtml(d.name || ''));
  h += row('Description', escapeHtml(d.description || ''));
  h += row('Mode', d.mode || '');
  (d.type || []).forEach((t) => h += row('Type', ccFull(t)));
  if (d.telecom?.length) {
    d.telecom.forEach((t) => h += row(t.system || 'Contact', escapeHtml(t.value || '')));
  }
  if (d.address) h += renderAddress(d.address);
  if (d.position) h += row('Position', `Lat: ${d.position.latitude}, Long: ${d.position.longitude}`);
  h += row('Managing Org', renderRef(d.managingOrganization));
  h += row('Part Of', renderRef(d.partOf));
  h += sectionEnd();
  return h;
}

// ─── Device ─────────────────────────────────────────────────────────────

function renderDevice(d) {
  let h = section('⚙️', 'Device');
  h += row('Status', statusBadge(d.status));
  h += row('Manufacturer', escapeHtml(d.manufacturer || ''));
  h += row('Model', escapeHtml(d.modelNumber || ''));
  h += row('Serial Number', escapeHtml(d.serialNumber || ''));
  h += row('Type', ccFull(d.type));
  h += row('Lot Number', escapeHtml(d.lotNumber || ''));
  h += row('Expiration', fmtDate(d.expirationDate));
  h += row('Owner', renderRef(d.owner));
  h += row('Location', renderRef(d.location));
  h += row('Patient', renderRef(d.patient));
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

// ─── Generic fallback ───────────────────────────────────────────────────

function renderGeneric(data) {
  let h = section('📄', data.resourceType || 'Resource');

  // Show common fields first
  h += row('ID', escapeHtml(data.id || ''));
  if (data.status) h += row('Status', statusBadge(data.status));
  if (data.code) h += row('Code', ccFull(data.code));
  if (data.subject) h += row('Subject', renderRef(data.subject));
  if (data.patient) h += row('Patient', renderRef(data.patient));
  if (data.encounter) h += row('Encounter', renderRef(data.encounter));

  const skip = new Set(['resourceType', 'id', 'text', 'meta', 'status', 'code', 'subject', 'patient', 'encounter']);
  const keys = Object.keys(data).filter((k) => !skip.has(k)).slice(0, 20);

  keys.forEach((key) => {
    const value = data[key];
    if (value === null || value === undefined) return;
    if (typeof value === 'object' && value.reference) {
      h += row(key, renderRef(value));
    } else if (Array.isArray(value) && value.length > 0 && value[0]?.reference) {
      value.forEach((v) => h += row(key, renderRef(v)));
    } else if (typeof value === 'object') {
      h += row(key, `<span class="coding-system">${escapeHtml(JSON.stringify(value).substring(0, 120))}${JSON.stringify(value).length > 120 ? '…' : ''}</span>`);
    } else {
      h += row(key, escapeHtml(String(value)));
    }
  });

  h += sectionEnd();
  return h;
}

// ─── Shared helpers ─────────────────────────────────────────────────────

function renderAddress(addr) {
  const parts = [
    ...(addr.line || []),
    addr.city, addr.district, addr.state, addr.postalCode, addr.country,
  ].filter(Boolean).map(escapeHtml);
  const use = addr.use ? ` (${addr.use})` : '';
  return row('Address', (parts.join(', ') || 'N/A') + use);
}

function calculateAge(birthDate) {
  if (!birthDate) return 'N/A';
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
