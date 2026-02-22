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
      if (entry.resource) {
        resources.push(createResource(entry.resource, sourceInfo, entry.fullUrl));
      }
    });
  } else if (json.resourceType) {
    resources.push(createResource(json, sourceInfo));
  } else if (Array.isArray(json)) {
    // Check if array contains FHIR resources
    const fhirItems = json.filter(item => item && item.resourceType);
    if (fhirItems.length > 0) {
      fhirItems.forEach((item) => {
        resources.push(createResource(item, sourceInfo));
      });
    } else {
      // Non-FHIR array - treat as generic JSON
      resources.push(createGenericJsonResource(json, sourceInfo));
    }
  } else if (typeof json === 'object' && json !== null) {
    // Non-FHIR JSON object - treat as generic JSON
    resources.push(createGenericJsonResource(json, sourceInfo));
  }
  return resources;
}

function createGenericJsonResource(obj, source) {
  return {
    type: 'JSON',
    id: `json-${Date.now().toString(36)}`,
    data: obj,
    source: source,
    isGenericJson: true, // Flag to identify non-FHIR resources
    get json() {
      const val = JSON.stringify(obj, null, 2);
      Object.defineProperty(this, 'json', { value: val });
      return val;
    },
  };
}

function createResource(obj, source, fullUrl = null) {
  return {
    type: obj.resourceType || 'Unknown',
    id: obj.id || '(no id)',
    fullUrl: fullUrl || null, // Store fullUrl for URL-based reference matching
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
    // Core Resources
    Patient: '👤', Practitioner: '👨‍⚕️', PractitionerRole: '🩻',
    Organization: '🏢', Observation: '📊', Procedure: '🏥',
    Medication: '💊', MedicationRequest: '📋', MedicationStatement: '📝',
    MedicationAdministration: '💉', MedicationDispense: '💊', Condition: '🩺',
    Bundle: '📦', Encounter: '🚪', DiagnosticReport: '📈',
    AllergyIntolerance: '⚠️', Immunization: '💉', ImmunizationRecommendation: '💉',
    Device: '⚙️', DeviceDefinition: '⚙️', DeviceRequest: '⚙️', DeviceUseStatement: '⚙️',
    Composition: '📑', DocumentReference: '📎', DocumentManifest: '📚',

    // Financial Resources (HCX/Claims)
    Claim: '💰', ClaimResponse: '🧾', Coverage: '🛡️', CoverageEligibilityRequest: '📋',
    CoverageEligibilityResponse: '✅', ExplanationOfBenefit: '📄', PaymentNotice: '💳',
    PaymentReconciliation: '💳', Invoice: '🧾', InsurancePlan: '🛡️', Account: '💼',
    Contract: '📝', ChargeItem: '💵', ChargeItemDefinition: '💵',

    // Clinical Resources
    ServiceRequest: '📨', Specimen: '🧪', BodyStructure: '🫀',
    CarePlan: '📅', CareTeam: '👥', Goal: '🎯', NutritionOrder: '🍎',
    VisionPrescription: '👓', RiskAssessment: '⚡', DetectedIssue: '⚠️',
    ClinicalImpression: '🔍', AdverseEvent: '⛔', Flag: '🚩',
    FamilyMemberHistory: '👨‍👩‍👧', RelatedPerson: '🤝',

    // Scheduling
    Location: '📍', HealthcareService: '🏨', Appointment: '📆',
    AppointmentResponse: '✅', Schedule: '📅', Slot: '⏰',

    // Workflow
    Task: '✏️', Communication: '💬', CommunicationRequest: '📨',
    Consent: '📜', Provenance: '🔏', AuditEvent: '📋',

    // Diagnostic
    ImagingStudy: '🔬', Media: '🖼️', MolecularSequence: '🧬',
    QuestionnaireResponse: '📝', Questionnaire: '❓',

    // Medication
    MedicationKnowledge: '📚', MedicationDispense: '💊',

    // Binary/Basic
    Binary: '🔢', Basic: '📄', List: '📋', Group: '👥',

    // NRCES India Specific
    HealthDocumentBundle: '📦', OPConsultRecord: '🏥', PrescriptionRecord: '📋',
    DiagnosticReportRecord: '📈', DischargeSummaryRecord: '📄',
    ImmunizationRecord: '💉', WellnessRecord: '❤️', HealthDocumentRecord: '📄',

    // Terminology
    ValueSet: '📖', CodeSystem: '📚', ConceptMap: '🗺️', NamingSystem: '📛',

    // Conformance
    CapabilityStatement: '📋', StructureDefinition: '🏗️', ImplementationGuide: '📖',
    OperationDefinition: '⚙️', SearchParameter: '🔍', MessageDefinition: '📨',

    // Other
    Endpoint: '🔗', Subscription: '📡', OperationOutcome: '⚠️',
    Parameters: '⚙️', Person: '👤', Linkage: '🔗', ResearchStudy: '🔬',
    ResearchSubject: '🔬', EpisodeOfCare: '📋', RequestGroup: '📋',
    ActivityDefinition: '📋', PlanDefinition: '📋', Library: '📚',
    Measure: '📏', MeasureReport: '📊', GuidanceResponse: '💡',
    SupplyRequest: '📦', SupplyDelivery: '📦', EnrollmentRequest: '📝',
    EnrollmentResponse: '✅', VerificationResult: '✅', BiologicallyDerivedProduct: '🧬',
    CatalogEntry: '📖', EffectEvidenceSynthesis: '📊', Evidence: '📊',
    EvidenceVariable: '📊', MedicinalProduct: '💊', MedicinalProductAuthorization: '✅',
    MedicinalProductIngredient: '🧪', MedicinalProductPackaged: '📦',
    OrganizationAffiliation: '🏢', SubstanceSpecification: '🧪',
    TerminologyCapabilities: '📖', TestReport: '📋', TestScript: '📋',

    // Generic JSON (non-FHIR)
    JSON: '📋',
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

// Collapsible subsection for large nested objects
function collapsibleSub(title, itemCount, defaultOpen = true) {
  const id = `cs-${Math.random().toString(36).substr(2, 9)}`;
  const checked = defaultOpen ? 'checked' : '';
  return `<div class="subsection collapsible-sub">
    <input type="checkbox" id="${id}" class="collapse-toggle" ${checked}>
    <label for="${id}" class="subsection-header collapsible-header">
      <span class="collapse-icon">▼</span>
      ${title}
      <span class="item-count">(${itemCount} item${itemCount !== 1 ? 's' : ''})</span>
    </label>
    <div class="collapsible-content">`;
}
function collapsibleSubEnd() { return '</div></div>'; }

function row(label, value) {
  if (!value && value !== 0) return '';
  return `<div class="row"><span class="label">${escapeHtml(label)}:</span><span class="value">${value}</span></div>`;
}

// ─── Main dispatcher ────────────────────────────────────────────────────

const renderers = {
  // Core Clinical
  Patient: renderPatient,
  Practitioner: renderPractitioner,
  PractitionerRole: renderPractitionerRole,
  Organization: renderOrganization,
  Observation: renderObservation,
  Condition: renderCondition,
  Procedure: renderProcedure,
  Encounter: renderEncounter,
  EpisodeOfCare: renderEpisodeOfCare,

  // Medication
  Medication: renderMedication,
  MedicationRequest: renderMedicationRequest,
  MedicationStatement: renderMedicationStatement,
  MedicationAdministration: renderMedicationAdministration,
  MedicationDispense: renderMedicationDispense,

  // Diagnostics
  DiagnosticReport: renderDiagnosticReport,
  ImagingStudy: renderImagingStudy,
  Media: renderMedia,
  Specimen: renderSpecimen,

  // Allergy & Immunization
  AllergyIntolerance: renderAllergyIntolerance,
  Immunization: renderImmunization,
  ImmunizationRecommendation: renderImmunizationRecommendation,

  // Documents
  Composition: renderComposition,
  DocumentReference: renderDocumentReference,
  DocumentManifest: renderDocumentManifest,
  Binary: renderBinary,

  // Financial (HCX)
  Claim: renderClaim,
  ClaimResponse: renderClaimResponse,
  Coverage: renderCoverage,
  CoverageEligibilityRequest: renderCoverageEligibilityRequest,
  CoverageEligibilityResponse: renderCoverageEligibilityResponse,
  ExplanationOfBenefit: renderExplanationOfBenefit,
  PaymentNotice: renderPaymentNotice,
  PaymentReconciliation: renderPaymentReconciliation,
  InsurancePlan: renderInsurancePlan,

  // Care Planning
  ServiceRequest: renderServiceRequest,
  CarePlan: renderCarePlan,
  CareTeam: renderCareTeam,
  Goal: renderGoal,
  NutritionOrder: renderNutritionOrder,
  VisionPrescription: renderVisionPrescription,
  RiskAssessment: renderRiskAssessment,

  // Scheduling
  Appointment: renderAppointment,
  AppointmentResponse: renderAppointmentResponse,
  Schedule: renderSchedule,
  Slot: renderSlot,

  // Devices
  Device: renderDevice,
  DeviceRequest: renderDeviceRequest,
  DeviceUseStatement: renderDeviceUseStatement,

  // Administrative
  Location: renderLocation,
  HealthcareService: renderHealthcareService,
  RelatedPerson: renderRelatedPerson,
  Person: renderPerson,
  Group: renderGroup,

  // Clinical Reasoning
  FamilyMemberHistory: renderFamilyMemberHistory,
  ClinicalImpression: renderClinicalImpression,
  DetectedIssue: renderDetectedIssue,
  AdverseEvent: renderAdverseEvent,
  Flag: renderFlag,

  // Workflow
  Task: renderTask,
  Communication: renderCommunication,
  CommunicationRequest: renderCommunicationRequest,
  Consent: renderConsent,
  Provenance: renderProvenance,
  AuditEvent: renderAuditEvent,

  // Questionnaire
  Questionnaire: renderQuestionnaire,
  QuestionnaireResponse: renderQuestionnaireResponse,

  // Lists
  List: renderList,

  // Other
  OperationOutcome: renderOperationOutcome,
  Bundle: renderBundle,
};

export function renderFormattedView(resource) {
  // Check if this is a generic non-FHIR JSON resource
  if (resource.isGenericJson) {
    return renderGenericJson(resource.data);
  }
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

  // Basic Info
  h += row('ID', escapeHtml(d.id || ''));
  h += row('Status', statusBadge(d.status));
  h += row('Type', ccFull(d.type));
  h += row('Sub-Type', ccFull(d.subType));
  h += row('Use', statusBadge(d.use, 'info'));
  h += row('Created', fmtDateTime(d.created));
  h += row('Billable Period', d.billablePeriod ? period(d.billablePeriod) : '');
  h += row('Priority', ccFull(d.priority));

  // Key References
  h += row('Patient', renderRef(d.patient));
  h += row('Provider', renderRef(d.provider));
  h += row('Insurer', renderRef(d.insurer));
  h += row('Facility', renderRef(d.facility));
  h += row('Prescription', renderRef(d.prescription));
  h += row('Original Prescription', renderRef(d.originalPrescription));
  h += row('Referral', renderRef(d.referral));
  h += row('Enterer', renderRef(d.enterer));

  // Payee
  if (d.payee) {
    h += sub('💳 Payee');
    h += row('Type', ccFull(d.payee.type));
    h += row('Party', renderRef(d.payee.party));
    h += subEnd();
  }

  // Related Claims
  if (d.related?.length) {
    h += sub('🔗 Related Claims');
    d.related.forEach((rel, i) => {
      h += row(`#${i + 1}`, renderRef(rel.claim));
      h += row('Relationship', ccFull(rel.relationship));
      if (rel.reference) h += row('Reference', escapeHtml(rel.reference.value || ''));
    });
    h += subEnd();
  }

  // Care Team
  if (d.careTeam?.length) {
    h += collapsibleSub('👥 Care Team', d.careTeam.length, d.careTeam.length <= 5);
    d.careTeam.forEach((ct) => {
      h += row(`#${ct.sequence || '?'}`, renderRef(ct.provider));
      h += row('Role', ccFull(ct.role));
      h += row('Qualification', ccFull(ct.qualification));
      if (ct.responsible !== undefined) h += row('Responsible', statusBadge(ct.responsible ? 'Yes' : 'No', ct.responsible ? 'success' : 'info'));
    });
    h += collapsibleSubEnd();
  }

  // Supporting Info
  if (d.supportingInfo?.length) {
    h += collapsibleSub('📎 Supporting Information', d.supportingInfo.length, d.supportingInfo.length <= 5);
    d.supportingInfo.forEach((info) => {
      const seqLabel = `#${info.sequence || '?'}`;
      h += row(seqLabel, ccFull(info.category));
      if (info.code) h += row('Code', ccFull(info.code));
      if (info.timingDate) h += row('Date', fmtDate(info.timingDate));
      if (info.timingPeriod) h += row('Period', period(info.timingPeriod));
      if (info.valueString) h += row('Value', escapeHtml(info.valueString));
      if (info.valueBoolean !== undefined) h += row('Value', statusBadge(info.valueBoolean ? 'Yes' : 'No'));
      if (info.valueQuantity) h += row('Quantity', quantity(info.valueQuantity));
      if (info.valueAttachment) {
        h += row('Attachment', escapeHtml(info.valueAttachment.title || info.valueAttachment.contentType || 'Attached'));
      }
      if (info.valueReference) h += row('Reference', renderRef(info.valueReference));
      if (info.reason) h += row('Reason', ccFull(info.reason));
    });
    h += collapsibleSubEnd();
  }

  // Diagnosis
  if (d.diagnosis?.length) {
    h += collapsibleSub('🩺 Diagnoses', d.diagnosis.length, d.diagnosis.length <= 5);
    d.diagnosis.forEach((diag) => {
      h += row(`#${diag.sequence || '?'}`, ccFull(diag.diagnosisCodeableConcept) || renderRef(diag.diagnosisReference));
      (diag.type || []).forEach((t) => h += row('Type', ccFull(t)));
      if (diag.onAdmission) h += row('On Admission', ccFull(diag.onAdmission));
      if (diag.packageCode) h += row('Package', ccFull(diag.packageCode));
    });
    h += collapsibleSubEnd();
  }

  // Procedures
  if (d.procedure?.length) {
    h += collapsibleSub('🏥 Procedures', d.procedure.length, d.procedure.length <= 5);
    d.procedure.forEach((proc) => {
      h += row(`#${proc.sequence || '?'}`, ccFull(proc.procedureCodeableConcept) || renderRef(proc.procedureReference));
      (proc.type || []).forEach((t) => h += row('Type', ccFull(t)));
      if (proc.date) h += row('Date', fmtDateTime(proc.date));
      (proc.udi || []).forEach((u) => h += row('UDI', renderRef(u)));
    });
    h += collapsibleSubEnd();
  }

  // Insurance
  if (d.insurance?.length) {
    h += collapsibleSub('🛡️ Insurance', d.insurance.length, d.insurance.length <= 3);
    d.insurance.forEach((ins, i) => {
      h += row(`#${ins.sequence || i + 1}`, renderRef(ins.coverage));
      h += row('Focal', ins.focal !== undefined ? statusBadge(ins.focal ? 'Yes' : 'No', ins.focal ? 'success' : 'info') : '');
      if (ins.identifier) h += row('Identifier', escapeHtml(ins.identifier.value || ''));
      h += row('Business Arrangement', escapeHtml(ins.businessArrangement || ''));
      h += row('Claim Response', renderRef(ins.claimResponse));
      (ins.preAuthRef || []).forEach((ref) => h += row('Pre-Auth Ref', escapeHtml(ref)));
    });
    h += collapsibleSubEnd();
  }

  // Accident
  if (d.accident) {
    h += sub('⚠️ Accident');
    h += row('Date', fmtDate(d.accident.date));
    h += row('Type', ccFull(d.accident.type));
    if (d.accident.locationAddress) h += renderAddress(d.accident.locationAddress);
    if (d.accident.locationReference) h += row('Location', renderRef(d.accident.locationReference));
    h += subEnd();
  }

  // Items
  if (d.item?.length) {
    h += collapsibleSub('📦 Items', d.item.length, d.item.length <= 5);
    d.item.forEach((item) => {
      h += row(`#${item.sequence || '?'}`, ccFull(item.productOrService));
      (item.careTeamSequence || []).forEach((seq) => h += row('Care Team Ref', `#${seq}`));
      (item.diagnosisSequence || []).forEach((seq) => h += row('Diagnosis Ref', `#${seq}`));
      (item.procedureSequence || []).forEach((seq) => h += row('Procedure Ref', `#${seq}`));
      (item.informationSequence || []).forEach((seq) => h += row('Info Ref', `#${seq}`));
      if (item.revenue) h += row('Revenue', ccFull(item.revenue));
      if (item.category) h += row('Category', ccFull(item.category));
      (item.modifier || []).forEach((m) => h += row('Modifier', ccFull(m)));
      (item.programCode || []).forEach((p) => h += row('Program Code', ccFull(p)));
      if (item.servicedDate) h += row('Service Date', fmtDate(item.servicedDate));
      if (item.servicedPeriod) h += row('Service Period', period(item.servicedPeriod));
      if (item.locationCodeableConcept) h += row('Location', ccFull(item.locationCodeableConcept));
      if (item.locationAddress) h += renderAddress(item.locationAddress);
      if (item.locationReference) h += row('Location', renderRef(item.locationReference));
      if (item.quantity) h += row('Quantity', quantity(item.quantity));
      if (item.unitPrice) h += row('Unit Price', quantity(item.unitPrice));
      if (item.factor) h += row('Factor', String(item.factor));
      if (item.net) h += row('Net', quantity(item.net));
      (item.udi || []).forEach((u) => h += row('UDI', renderRef(u)));
      if (item.bodySite) h += row('Body Site', ccFull(item.bodySite));
      (item.subSite || []).forEach((s) => h += row('Sub-Site', ccFull(s)));
      (item.encounter || []).forEach((e) => h += row('Encounter', renderRef(e)));

      // Detail items
      if (item.detail?.length) {
        item.detail.forEach((det) => {
          h += row(`  └ Detail #${det.sequence || '?'}`, ccFull(det.productOrService));
          if (det.quantity) h += row('    Quantity', quantity(det.quantity));
          if (det.unitPrice) h += row('    Unit Price', quantity(det.unitPrice));
          if (det.net) h += row('    Net', quantity(det.net));

          // Sub-detail items
          if (det.subDetail?.length) {
            det.subDetail.forEach((subDet) => {
              h += row(`      └ Sub #${subDet.sequence || '?'}`, ccFull(subDet.productOrService));
              if (subDet.quantity) h += row('        Quantity', quantity(subDet.quantity));
              if (subDet.net) h += row('        Net', quantity(subDet.net));
            });
          }
        });
      }
    });
    h += collapsibleSubEnd();
  }

  // Total
  if (d.total) h += row('Total', quantity(d.total));

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

// ─── Additional Resource Renderers ──────────────────────────────────────

function renderMedicationDispense(d) {
  let h = section('💊', 'Medication Dispense');
  h += row('Status', statusBadge(d.status));
  h += row('Medication', d.medicationCodeableConcept ? ccFull(d.medicationCodeableConcept) : renderRef(d.medicationReference));
  h += row('Subject', renderRef(d.subject));
  h += row('Context', renderRef(d.context));
  h += row('Performer', renderRef(d.performer?.[0]?.actor));
  h += row('Location', renderRef(d.location));
  h += row('Authorizing Prescription', renderRef(d.authorizingPrescription?.[0]));
  h += row('Type', ccFull(d.type));
  h += row('Quantity', quantity(d.quantity));
  h += row('Days Supply', quantity(d.daysSupply));
  h += row('When Prepared', fmtDateTime(d.whenPrepared));
  h += row('When Handed Over', fmtDateTime(d.whenHandedOver));
  h += row('Destination', renderRef(d.destination));
  (d.receiver || []).forEach((r) => h += row('Receiver', renderRef(r)));
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

function renderImmunizationRecommendation(d) {
  let h = section('💉', 'Immunization Recommendation');
  h += row('Patient', renderRef(d.patient));
  h += row('Date', fmtDateTime(d.date));
  h += row('Authority', renderRef(d.authority));
  if (d.recommendation?.length) {
    h += sub('📋 Recommendations');
    d.recommendation.forEach((r, i) => {
      h += row(`#${i + 1}`, '');
      (r.vaccineCode || []).forEach((v) => h += row('Vaccine', ccFull(v)));
      h += row('Target Disease', ccFull(r.targetDisease));
      h += row('Dose Number', r.doseNumberPositiveInt || r.doseNumberString || '');
      h += row('Forecast Status', ccFull(r.forecastStatus));
      (r.dateCriterion || []).forEach((dc) => {
        h += row(cc(dc.code), fmtDateTime(dc.value));
      });
    });
    h += subEnd();
  }
  h += sectionEnd();
  return h;
}

function renderImagingStudy(d) {
  let h = section('🔬', 'Imaging Study');
  h += row('Status', statusBadge(d.status));
  h += row('Subject', renderRef(d.subject));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Started', fmtDateTime(d.started));
  (d.basedOn || []).forEach((b) => h += row('Based On', renderRef(b)));
  h += row('Referrer', renderRef(d.referrer));
  (d.interpreter || []).forEach((i) => h += row('Interpreter', renderRef(i)));
  h += row('Number of Series', d.numberOfSeries);
  h += row('Number of Instances', d.numberOfInstances);
  h += row('Procedure Reference', renderRef(d.procedureReference));
  (d.procedureCode || []).forEach((c) => h += row('Procedure', ccFull(c)));
  h += row('Location', renderRef(d.location));
  (d.reasonCode || []).forEach((c) => h += row('Reason', ccFull(c)));
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  if (d.series?.length) {
    h += sub('📸 Series');
    d.series.forEach((s, i) => {
      h += row(`Series ${i + 1}`, escapeHtml(s.description || ''));
      h += row('Modality', s.modality?.code || '');
      h += row('Body Site', ccFull(s.bodySite));
      h += row('Instances', s.numberOfInstances);
    });
    h += subEnd();
  }
  h += sectionEnd();
  return h;
}

function renderMedia(d) {
  let h = section('🖼️', 'Media');
  h += row('Status', statusBadge(d.status));
  h += row('Type', ccFull(d.type));
  h += row('Modality', ccFull(d.modality));
  h += row('View', ccFull(d.view));
  h += row('Subject', renderRef(d.subject));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Created', d.createdDateTime ? fmtDateTime(d.createdDateTime) : d.createdPeriod ? period(d.createdPeriod) : '');
  h += row('Issued', fmtDateTime(d.issued));
  h += row('Operator', renderRef(d.operator));
  (d.reasonCode || []).forEach((c) => h += row('Reason', ccFull(c)));
  h += row('Body Site', ccFull(d.bodySite));
  h += row('Device', renderRef(d.device));
  h += row('Device Name', escapeHtml(d.deviceName || ''));
  h += row('Height', d.height ? `${d.height} px` : '');
  h += row('Width', d.width ? `${d.width} px` : '');
  h += row('Duration', d.duration ? `${d.duration} sec` : '');
  if (d.content) {
    h += row('Content Type', escapeHtml(d.content.contentType || ''));
    h += row('Size', d.content.size ? `${d.content.size} bytes` : '');
  }
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

function renderDocumentManifest(d) {
  let h = section('📚', 'Document Manifest');
  h += row('Status', statusBadge(d.status));
  h += row('Type', ccFull(d.type));
  h += row('Subject', renderRef(d.subject));
  h += row('Created', fmtDateTime(d.created));
  (d.author || []).forEach((a) => h += row('Author', renderRef(a)));
  (d.recipient || []).forEach((r) => h += row('Recipient', renderRef(r)));
  h += row('Source', escapeHtml(d.source || ''));
  h += row('Description', escapeHtml(d.description || ''));
  if (d.content?.length) {
    h += sub('📄 Content');
    d.content.forEach((c, i) => h += row(`Document ${i + 1}`, renderRef(c)));
    h += subEnd();
  }
  (d.related || []).forEach((r) => h += row('Related', renderRef(r.ref)));
  h += sectionEnd();
  return h;
}

function renderBinary(d) {
  let h = section('🔢', 'Binary');
  h += row('ID', escapeHtml(d.id || ''));
  h += row('Content Type', escapeHtml(d.contentType || ''));
  h += row('Security Context', renderRef(d.securityContext));
  if (d.data) {
    const size = Math.round(d.data.length * 0.75);
    h += row('Data Size', `~${formatBytesSimple(size)}`);
  }
  h += sectionEnd();
  return h;
}

function renderClaimResponse(d) {
  let h = section('🧾', 'Claim Response');

  // Basic Info
  h += row('ID', escapeHtml(d.id || ''));
  h += row('Status', statusBadge(d.status));
  h += row('Type', ccFull(d.type));
  h += row('Sub-Type', ccFull(d.subType));
  h += row('Use', statusBadge(d.use, 'info'));
  h += row('Created', fmtDateTime(d.created));
  h += row('Outcome', statusBadge(d.outcome));
  h += row('Disposition', escapeHtml(d.disposition || ''));

  // Key References
  h += row('Patient', renderRef(d.patient));
  h += row('Insurer', renderRef(d.insurer));
  h += row('Requestor', renderRef(d.requestor));
  h += row('Request', renderRef(d.request));
  h += row('Pre Auth Ref', escapeHtml(d.preAuthRef || ''));
  h += row('Pre Auth Period', d.preAuthPeriod ? period(d.preAuthPeriod) : '');

  // Payee
  if (d.payeeType) h += row('Payee Type', ccFull(d.payeeType));

  // Items
  if (d.item?.length) {
    h += sub('📦 Items');
    d.item.forEach((item) => {
      h += row(`#${item.itemSequence || '?'}`, '');
      if (item.noteNumber?.length) h += row('Note #', item.noteNumber.join(', '));

      // Adjudication
      if (item.adjudication?.length) {
        item.adjudication.forEach((adj) => {
          const cat = ccFull(adj.category);
          if (adj.amount) {
            h += row(`  ${cat}`, quantity(adj.amount));
          } else if (adj.value !== undefined) {
            h += row(`  ${cat}`, String(adj.value));
          } else if (adj.reason) {
            h += row(`  ${cat}`, ccFull(adj.reason));
          }
        });
      }

      // Detail
      if (item.detail?.length) {
        item.detail.forEach((det) => {
          h += row(`  └ Detail #${det.detailSequence || '?'}`, '');
          if (det.adjudication?.length) {
            det.adjudication.forEach((adj) => {
              const cat = ccFull(adj.category);
              if (adj.amount) h += row(`    ${cat}`, quantity(adj.amount));
            });
          }
        });
      }
    });
    h += subEnd();
  }

  // Add Items (for additional items requested)
  if (d.addItem?.length) {
    h += sub('➕ Added Items');
    d.addItem.forEach((item, i) => {
      h += row(`#${i + 1}`, ccFull(item.productOrService));
      (item.itemSequence || []).forEach((seq) => h += row('Item Ref', `#${seq}`));
      if (item.net) h += row('Net', quantity(item.net));
    });
    h += subEnd();
  }

  // Totals
  if (d.total?.length) {
    h += sub('💰 Totals');
    d.total.forEach((t) => h += row(ccFull(t.category), quantity(t.amount)));
    h += subEnd();
  }

  // Payment
  if (d.payment) {
    h += sub('💳 Payment');
    h += row('Type', ccFull(d.payment.type));
    h += row('Adjustment', quantity(d.payment.adjustment));
    h += row('Adjustment Reason', ccFull(d.payment.adjustmentReason));
    h += row('Amount', quantity(d.payment.amount));
    h += row('Date', fmtDate(d.payment.date));
    if (d.payment.identifier) h += row('Identifier', escapeHtml(d.payment.identifier.value || ''));
    h += subEnd();
  }

  // Fund Reserve
  if (d.fundsReserve) h += row('Funds Reserve', ccFull(d.fundsReserve));

  // Form
  if (d.form) h += row('Form Code', ccFull(d.form));
  if (d.formCode) h += row('Form Code', ccFull(d.formCode));

  // Process Notes
  if (d.processNote?.length) {
    h += sub('📝 Process Notes');
    d.processNote.forEach((note) => {
      h += row(`#${note.number || '?'}`, escapeHtml(note.text || ''));
      if (note.type) h += row('Type', statusBadge(note.type, 'info'));
      if (note.language) h += row('Language', ccFull(note.language));
    });
    h += subEnd();
  }

  // Communication Request
  (d.communicationRequest || []).forEach((c) => h += row('Communication', renderRef(c)));

  // Insurance
  if (d.insurance?.length) {
    h += sub('🛡️ Insurance');
    d.insurance.forEach((ins, i) => {
      h += row(`#${ins.sequence || i + 1}`, renderRef(ins.coverage));
      h += row('Focal', ins.focal !== undefined ? statusBadge(ins.focal ? 'Yes' : 'No', ins.focal ? 'success' : 'info') : '');
      h += row('Business Arrangement', escapeHtml(ins.businessArrangement || ''));
      h += row('Claim Response', renderRef(ins.claimResponse));
    });
    h += subEnd();
  }

  // Errors
  if (d.error?.length) {
    h += sub('⚠️ Errors');
    d.error.forEach((err) => {
      h += row(`Item #${err.itemSequence || '-'}`, ccFull(err.code));
      if (err.detailSequence) h += row('Detail Seq', `#${err.detailSequence}`);
      if (err.subDetailSequence) h += row('SubDetail Seq', `#${err.subDetailSequence}`);
    });
    h += subEnd();
  }

  h += sectionEnd();
  return h;
}

function renderCoverageEligibilityRequest(d) {
  let h = section('📋', 'Coverage Eligibility Request');
  h += row('Status', statusBadge(d.status));
  h += row('Purpose', (d.purpose || []).map(p => statusBadge(p, 'info')).join(' '));
  h += row('Patient', renderRef(d.patient));
  h += row('Serviced', d.servicedDate ? fmtDate(d.servicedDate) : d.servicedPeriod ? period(d.servicedPeriod) : '');
  h += row('Created', fmtDateTime(d.created));
  h += row('Enterer', renderRef(d.enterer));
  h += row('Provider', renderRef(d.provider));
  h += row('Insurer', renderRef(d.insurer));
  h += row('Facility', renderRef(d.facility));
  (d.insurance || []).forEach((i) => {
    h += row('Coverage', renderRef(i.coverage));
    h += row('Business Arrangement', escapeHtml(i.businessArrangement || ''));
  });
  h += sectionEnd();
  return h;
}

function renderCoverageEligibilityResponse(d) {
  let h = section('✅', 'Coverage Eligibility Response');
  h += row('Status', statusBadge(d.status));
  h += row('Purpose', (d.purpose || []).map(p => statusBadge(p, 'info')).join(' '));
  h += row('Patient', renderRef(d.patient));
  h += row('Serviced', d.servicedDate ? fmtDate(d.servicedDate) : d.servicedPeriod ? period(d.servicedPeriod) : '');
  h += row('Created', fmtDateTime(d.created));
  h += row('Requestor', renderRef(d.requestor));
  h += row('Request', renderRef(d.request));
  h += row('Outcome', statusBadge(d.outcome));
  h += row('Disposition', escapeHtml(d.disposition || ''));
  h += row('Insurer', renderRef(d.insurer));
  if (d.insurance?.length) {
    h += sub('🛡️ Insurance');
    d.insurance.forEach((i) => {
      h += row('Coverage', renderRef(i.coverage));
      h += row('In Force', i.inforce !== undefined ? statusBadge(String(i.inforce), i.inforce ? 'success' : 'error') : '');
    });
    h += subEnd();
  }
  h += sectionEnd();
  return h;
}

function renderExplanationOfBenefit(d) {
  let h = section('📄', 'Explanation of Benefit');
  h += row('Status', statusBadge(d.status));
  h += row('Type', ccFull(d.type));
  h += row('Sub Type', ccFull(d.subType));
  h += row('Use', statusBadge(d.use, 'info'));
  h += row('Patient', renderRef(d.patient));
  h += row('Billable Period', d.billablePeriod ? period(d.billablePeriod) : '');
  h += row('Created', fmtDateTime(d.created));
  h += row('Insurer', renderRef(d.insurer));
  h += row('Provider', renderRef(d.provider));
  h += row('Outcome', statusBadge(d.outcome));
  h += row('Disposition', escapeHtml(d.disposition || ''));
  h += row('Claim', renderRef(d.claim));
  h += row('Claim Response', renderRef(d.claimResponse));
  if (d.total?.length) {
    h += sub('💰 Totals');
    d.total.forEach((t) => h += row(ccFull(t.category), quantity(t.amount)));
    h += subEnd();
  }
  if (d.payment) {
    h += row('Payment Amount', quantity(d.payment.amount));
    h += row('Payment Date', fmtDate(d.payment.date));
  }
  h += sectionEnd();
  return h;
}

function renderPaymentNotice(d) {
  let h = section('💳', 'Payment Notice');
  h += row('Status', statusBadge(d.status));
  h += row('Request', renderRef(d.request));
  h += row('Response', renderRef(d.response));
  h += row('Created', fmtDateTime(d.created));
  h += row('Provider', renderRef(d.provider));
  h += row('Payment', renderRef(d.payment));
  h += row('Payment Date', fmtDate(d.paymentDate));
  h += row('Payee', renderRef(d.payee));
  h += row('Recipient', renderRef(d.recipient));
  h += row('Amount', quantity(d.amount));
  h += row('Payment Status', ccFull(d.paymentStatus));
  h += sectionEnd();
  return h;
}

function renderPaymentReconciliation(d) {
  let h = section('💳', 'Payment Reconciliation');
  h += row('Status', statusBadge(d.status));
  h += row('Period', d.period ? period(d.period) : '');
  h += row('Created', fmtDateTime(d.created));
  h += row('Payment Issuer', renderRef(d.paymentIssuer));
  h += row('Request', renderRef(d.request));
  h += row('Requestor', renderRef(d.requestor));
  h += row('Outcome', statusBadge(d.outcome));
  h += row('Disposition', escapeHtml(d.disposition || ''));
  h += row('Payment Date', fmtDate(d.paymentDate));
  h += row('Payment Amount', quantity(d.paymentAmount));
  h += sectionEnd();
  return h;
}

function renderInsurancePlan(d) {
  let h = section('🛡️', 'Insurance Plan');
  h += row('Status', statusBadge(d.status));
  h += row('Name', escapeHtml(d.name || ''));
  (d.type || []).forEach((t) => h += row('Type', ccFull(t)));
  h += row('Period', d.period ? period(d.period) : '');
  (d.ownedBy || []).forEach ? (Array.isArray(d.ownedBy) ? d.ownedBy : [d.ownedBy]).forEach((o) => h += row('Owned By', renderRef(o))) : h += row('Owned By', renderRef(d.ownedBy));
  (d.administeredBy || []).forEach ? (Array.isArray(d.administeredBy) ? d.administeredBy : [d.administeredBy]).forEach((a) => h += row('Administered By', renderRef(a))) : h += row('Administered By', renderRef(d.administeredBy));
  (d.coverageArea || []).forEach((c) => h += row('Coverage Area', renderRef(c)));
  h += sectionEnd();
  return h;
}

function renderNutritionOrder(d) {
  let h = section('🍎', 'Nutrition Order');
  h += row('Status', statusBadge(d.status));
  h += row('Intent', statusBadge(d.intent, 'info'));
  h += row('Patient', renderRef(d.patient));
  h += row('Encounter', renderRef(d.encounter));
  h += row('DateTime', fmtDateTime(d.dateTime));
  h += row('Orderer', renderRef(d.orderer));
  (d.allergyIntolerance || []).forEach((a) => h += row('Allergy', renderRef(a)));
  (d.foodPreferenceModifier || []).forEach((f) => h += row('Food Preference', ccFull(f)));
  (d.excludeFoodModifier || []).forEach((e) => h += row('Exclude Food', ccFull(e)));
  if (d.oralDiet) {
    h += sub('🍽️ Oral Diet');
    (d.oralDiet.type || []).forEach((t) => h += row('Type', ccFull(t)));
    h += row('Instruction', escapeHtml(d.oralDiet.instruction || ''));
    h += subEnd();
  }
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

function renderVisionPrescription(d) {
  let h = section('👓', 'Vision Prescription');
  h += row('Status', statusBadge(d.status));
  h += row('Created', fmtDateTime(d.created));
  h += row('Patient', renderRef(d.patient));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Date Written', fmtDateTime(d.dateWritten));
  h += row('Prescriber', renderRef(d.prescriber));
  if (d.lensSpecification?.length) {
    h += sub('👁️ Lens Specification');
    d.lensSpecification.forEach((l, i) => {
      h += row(`Lens ${i + 1}`, '');
      h += row('Eye', l.eye);
      h += row('Sphere', l.sphere);
      h += row('Cylinder', l.cylinder);
      h += row('Axis', l.axis);
      h += row('Add', l.add);
      h += row('Power', l.power);
    });
    h += subEnd();
  }
  h += sectionEnd();
  return h;
}

function renderRiskAssessment(d) {
  let h = section('⚡', 'Risk Assessment');
  h += row('Status', statusBadge(d.status));
  h += row('Subject', renderRef(d.subject));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Occurrence', d.occurrenceDateTime ? fmtDateTime(d.occurrenceDateTime) : d.occurrencePeriod ? period(d.occurrencePeriod) : '');
  h += row('Condition', renderRef(d.condition));
  h += row('Performer', renderRef(d.performer));
  (d.reasonCode || []).forEach((c) => h += row('Reason', ccFull(c)));
  (d.basis || []).forEach((b) => h += row('Basis', renderRef(b)));
  if (d.prediction?.length) {
    h += sub('📊 Predictions');
    d.prediction.forEach((p) => {
      h += row('Outcome', ccFull(p.outcome));
      h += row('Probability', p.probabilityDecimal !== undefined ? `${(p.probabilityDecimal * 100).toFixed(1)}%` : '');
      h += row('When', p.whenPeriod ? period(p.whenPeriod) : p.whenRange ? `${quantity(p.whenRange.low)} - ${quantity(p.whenRange.high)}` : '');
      h += row('Rationale', escapeHtml(p.rationale || ''));
    });
    h += subEnd();
  }
  h += row('Mitigation', escapeHtml(d.mitigation || ''));
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

function renderAppointmentResponse(d) {
  let h = section('✅', 'Appointment Response');
  h += row('Appointment', renderRef(d.appointment));
  h += row('Start', fmtDateTime(d.start));
  h += row('End', fmtDateTime(d.end));
  (d.participantType || []).forEach((t) => h += row('Participant Type', ccFull(t)));
  h += row('Actor', renderRef(d.actor));
  h += row('Participant Status', statusBadge(d.participantStatus));
  h += row('Comment', escapeHtml(d.comment || ''));
  h += sectionEnd();
  return h;
}

function renderSchedule(d) {
  let h = section('📅', 'Schedule');
  h += row('Active', d.active !== undefined ? statusBadge(String(d.active), d.active ? 'success' : 'error') : '');
  (d.serviceCategory || []).forEach((c) => h += row('Service Category', ccFull(c)));
  (d.serviceType || []).forEach((t) => h += row('Service Type', ccFull(t)));
  (d.specialty || []).forEach((s) => h += row('Specialty', ccFull(s)));
  (d.actor || []).forEach((a) => h += row('Actor', renderRef(a)));
  h += row('Planning Horizon', d.planningHorizon ? period(d.planningHorizon) : '');
  h += row('Comment', escapeHtml(d.comment || ''));
  h += sectionEnd();
  return h;
}

function renderSlot(d) {
  let h = section('⏰', 'Slot');
  h += row('Status', statusBadge(d.status));
  (d.serviceCategory || []).forEach((c) => h += row('Service Category', ccFull(c)));
  (d.serviceType || []).forEach((t) => h += row('Service Type', ccFull(t)));
  (d.specialty || []).forEach((s) => h += row('Specialty', ccFull(s)));
  h += row('Appointment Type', ccFull(d.appointmentType));
  h += row('Schedule', renderRef(d.schedule));
  h += row('Start', fmtDateTime(d.start));
  h += row('End', fmtDateTime(d.end));
  h += row('Overbooked', d.overbooked !== undefined ? String(d.overbooked) : '');
  h += row('Comment', escapeHtml(d.comment || ''));
  h += sectionEnd();
  return h;
}

function renderDeviceRequest(d) {
  let h = section('⚙️', 'Device Request');
  h += row('Status', statusBadge(d.status));
  h += row('Intent', statusBadge(d.intent, 'info'));
  h += row('Priority', d.priority ? statusBadge(d.priority) : '');
  h += row('Code', d.codeCodeableConcept ? ccFull(d.codeCodeableConcept) : renderRef(d.codeReference));
  h += row('Subject', renderRef(d.subject));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Occurrence', d.occurrenceDateTime ? fmtDateTime(d.occurrenceDateTime) : d.occurrencePeriod ? period(d.occurrencePeriod) : '');
  h += row('Authored On', fmtDateTime(d.authoredOn));
  h += row('Requester', renderRef(d.requester));
  h += row('Performer', renderRef(d.performer));
  (d.reasonCode || []).forEach((c) => h += row('Reason', ccFull(c)));
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

function renderDeviceUseStatement(d) {
  let h = section('⚙️', 'Device Use Statement');
  h += row('Status', statusBadge(d.status));
  h += row('Subject', renderRef(d.subject));
  h += row('Device', renderRef(d.device));
  h += row('Timing', d.timingDateTime ? fmtDateTime(d.timingDateTime) : d.timingPeriod ? period(d.timingPeriod) : '');
  h += row('Recorded On', fmtDateTime(d.recordedOn));
  h += row('Source', renderRef(d.source));
  (d.reasonCode || []).forEach((c) => h += row('Reason', ccFull(c)));
  (d.reasonReference || []).forEach((r) => h += row('Reason Ref', renderRef(r)));
  h += row('Body Site', ccFull(d.bodySite));
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

function renderHealthcareService(d) {
  let h = section('🏨', 'Healthcare Service');
  h += row('Active', d.active !== undefined ? statusBadge(String(d.active), d.active ? 'success' : 'error') : '');
  h += row('Provided By', renderRef(d.providedBy));
  (d.category || []).forEach((c) => h += row('Category', ccFull(c)));
  (d.type || []).forEach((t) => h += row('Type', ccFull(t)));
  (d.specialty || []).forEach((s) => h += row('Specialty', ccFull(s)));
  (d.location || []).forEach((l) => h += row('Location', renderRef(l)));
  h += row('Name', escapeHtml(d.name || ''));
  h += row('Comment', escapeHtml(d.comment || ''));
  h += row('Extra Details', escapeHtml(d.extraDetails || ''));
  (d.telecom || []).forEach((t) => h += row(t.system || 'Contact', escapeHtml(t.value || '')));
  (d.coverageArea || []).forEach((c) => h += row('Coverage Area', renderRef(c)));
  h += row('Appointment Required', d.appointmentRequired !== undefined ? String(d.appointmentRequired) : '');
  h += sectionEnd();
  return h;
}

function renderRelatedPerson(d) {
  let h = section('🤝', 'Related Person');
  h += row('Active', d.active !== undefined ? statusBadge(String(d.active), d.active ? 'success' : 'error') : '');
  h += row('Patient', renderRef(d.patient));
  (d.relationship || []).forEach((r) => h += row('Relationship', ccFull(r)));
  const name = d.name?.[0];
  const nameStr = name ? (name.text || `${(name.given || []).join(' ')} ${name.family || ''}`.trim()) : '';
  h += row('Name', escapeHtml(nameStr));
  h += row('Gender', d.gender ? statusBadge(d.gender, 'info') : '');
  h += row('Birth Date', fmtDate(d.birthDate));
  (d.telecom || []).forEach((t) => h += row(t.system || 'Contact', escapeHtml(t.value || '')));
  if (d.address?.length) {
    d.address.forEach((a) => h += renderAddress(a));
  }
  h += row('Period', d.period ? period(d.period) : '');
  h += sectionEnd();
  return h;
}

function renderPerson(d) {
  let h = section('👤', 'Person');
  h += row('Active', d.active !== undefined ? statusBadge(String(d.active), d.active ? 'success' : 'error') : '');
  const name = d.name?.[0];
  const nameStr = name ? (name.text || `${(name.given || []).join(' ')} ${name.family || ''}`.trim()) : '';
  h += row('Name', escapeHtml(nameStr));
  h += row('Gender', d.gender ? statusBadge(d.gender, 'info') : '');
  h += row('Birth Date', fmtDate(d.birthDate));
  (d.telecom || []).forEach((t) => h += row(t.system || 'Contact', escapeHtml(t.value || '')));
  if (d.address?.length) {
    d.address.forEach((a) => h += renderAddress(a));
  }
  h += row('Managing Organization', renderRef(d.managingOrganization));
  if (d.link?.length) {
    h += sub('🔗 Links');
    d.link.forEach((l) => h += row('Target', renderRef(l.target)));
    h += subEnd();
  }
  h += sectionEnd();
  return h;
}

function renderGroup(d) {
  let h = section('👥', 'Group');
  h += row('Active', d.active !== undefined ? statusBadge(String(d.active), d.active ? 'success' : 'error') : '');
  h += row('Type', d.type ? statusBadge(d.type, 'info') : '');
  h += row('Actual', d.actual !== undefined ? String(d.actual) : '');
  h += row('Code', ccFull(d.code));
  h += row('Name', escapeHtml(d.name || ''));
  h += row('Quantity', d.quantity !== undefined ? String(d.quantity) : '');
  h += row('Managing Entity', renderRef(d.managingEntity));
  if (d.member?.length) {
    h += sub('👥 Members');
    d.member.slice(0, 10).forEach((m) => {
      h += row('Entity', renderRef(m.entity));
      h += row('Period', m.period ? period(m.period) : '');
      h += row('Inactive', m.inactive !== undefined ? String(m.inactive) : '');
    });
    if (d.member.length > 10) h += row('...', `${d.member.length - 10} more members`);
    h += subEnd();
  }
  h += sectionEnd();
  return h;
}

function renderEpisodeOfCare(d) {
  let h = section('📋', 'Episode of Care');
  h += row('Status', statusBadge(d.status));
  (d.type || []).forEach((t) => h += row('Type', ccFull(t)));
  (d.diagnosis || []).forEach((diag) => {
    h += row('Diagnosis', renderRef(diag.condition));
    h += row('Role', ccFull(diag.role));
    h += row('Rank', diag.rank !== undefined ? String(diag.rank) : '');
  });
  h += row('Patient', renderRef(d.patient));
  h += row('Managing Organization', renderRef(d.managingOrganization));
  h += row('Period', d.period ? period(d.period) : '');
  (d.referralRequest || []).forEach((r) => h += row('Referral', renderRef(r)));
  h += row('Care Manager', renderRef(d.careManager));
  (d.team || []).forEach((t) => h += row('Team', renderRef(t)));
  h += sectionEnd();
  return h;
}

function renderClinicalImpression(d) {
  let h = section('🔍', 'Clinical Impression');
  h += row('Status', statusBadge(d.status));
  h += row('Code', ccFull(d.code));
  h += row('Description', escapeHtml(d.description || ''));
  h += row('Subject', renderRef(d.subject));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Effective', d.effectiveDateTime ? fmtDateTime(d.effectiveDateTime) : d.effectivePeriod ? period(d.effectivePeriod) : '');
  h += row('Date', fmtDateTime(d.date));
  h += row('Assessor', renderRef(d.assessor));
  h += row('Previous', renderRef(d.previous));
  (d.problem || []).forEach((p) => h += row('Problem', renderRef(p)));
  if (d.investigation?.length) {
    h += sub('🔬 Investigation');
    d.investigation.forEach((i) => {
      h += row('Code', ccFull(i.code));
      (i.item || []).forEach((it) => h += row('Item', renderRef(it)));
    });
    h += subEnd();
  }
  (d.finding || []).forEach((f) => {
    h += row('Finding', ccFull(f.itemCodeableConcept) || renderRef(f.itemReference));
    h += row('Basis', escapeHtml(f.basis || ''));
  });
  h += row('Summary', escapeHtml(d.summary || ''));
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

function renderDetectedIssue(d) {
  let h = section('⚠️', 'Detected Issue');
  h += row('Status', statusBadge(d.status));
  h += row('Code', ccFull(d.code));
  h += row('Severity', d.severity ? statusBadge(d.severity, d.severity === 'high' ? 'error' : 'warning') : '');
  h += row('Patient', renderRef(d.patient));
  h += row('Identified', d.identifiedDateTime ? fmtDateTime(d.identifiedDateTime) : d.identifiedPeriod ? period(d.identifiedPeriod) : '');
  h += row('Author', renderRef(d.author));
  (d.implicated || []).forEach((i) => h += row('Implicated', renderRef(i)));
  h += row('Detail', escapeHtml(d.detail || ''));
  h += row('Reference', escapeHtml(d.reference || ''));
  if (d.mitigation?.length) {
    h += sub('✅ Mitigation');
    d.mitigation.forEach((m) => {
      h += row('Action', ccFull(m.action));
      h += row('Date', fmtDateTime(m.date));
      h += row('Author', renderRef(m.author));
    });
    h += subEnd();
  }
  h += sectionEnd();
  return h;
}

function renderAdverseEvent(d) {
  let h = section('⛔', 'Adverse Event');
  h += row('Actuality', statusBadge(d.actuality, d.actuality === 'actual' ? 'error' : 'warning'));
  (d.category || []).forEach((c) => h += row('Category', ccFull(c)));
  h += row('Event', ccFull(d.event));
  h += row('Subject', renderRef(d.subject));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Date', fmtDateTime(d.date));
  h += row('Detected', fmtDateTime(d.detected));
  h += row('Recorded Date', fmtDateTime(d.recordedDate));
  h += row('Recorder', renderRef(d.recorder));
  h += row('Seriousness', ccFull(d.seriousness));
  h += row('Severity', ccFull(d.severity));
  h += row('Outcome', ccFull(d.outcome));
  (d.resultingCondition || []).forEach((c) => h += row('Resulting Condition', renderRef(c)));
  h += row('Location', renderRef(d.location));
  if (d.suspectEntity?.length) {
    h += sub('🔍 Suspect Entity');
    d.suspectEntity.forEach((s) => {
      h += row('Instance', renderRef(s.instance));
    });
    h += subEnd();
  }
  h += sectionEnd();
  return h;
}

function renderFlag(d) {
  let h = section('🚩', 'Flag');
  h += row('Status', statusBadge(d.status));
  (d.category || []).forEach((c) => h += row('Category', ccFull(c)));
  h += row('Code', ccFull(d.code));
  h += row('Subject', renderRef(d.subject));
  h += row('Period', d.period ? period(d.period) : '');
  h += row('Encounter', renderRef(d.encounter));
  h += row('Author', renderRef(d.author));
  h += sectionEnd();
  return h;
}

function renderTask(d) {
  let h = section('✏️', 'Task');
  h += row('Status', statusBadge(d.status));
  h += row('Status Reason', ccFull(d.statusReason));
  h += row('Business Status', ccFull(d.businessStatus));
  h += row('Intent', statusBadge(d.intent, 'info'));
  h += row('Priority', d.priority ? statusBadge(d.priority) : '');
  h += row('Code', ccFull(d.code));
  h += row('Description', escapeHtml(d.description || ''));
  h += row('Focus', renderRef(d.focus));
  h += row('For', renderRef(d.for));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Execution Period', d.executionPeriod ? period(d.executionPeriod) : '');
  h += row('Authored On', fmtDateTime(d.authoredOn));
  h += row('Last Modified', fmtDateTime(d.lastModified));
  h += row('Requester', renderRef(d.requester));
  h += row('Owner', renderRef(d.owner));
  h += row('Location', renderRef(d.location));
  (d.reasonCode || []).forEach((c) => h += row('Reason', ccFull(c)));
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

function renderCommunication(d) {
  let h = section('💬', 'Communication');
  h += row('Status', statusBadge(d.status));
  h += row('Status Reason', ccFull(d.statusReason));
  (d.category || []).forEach((c) => h += row('Category', ccFull(c)));
  h += row('Priority', d.priority ? statusBadge(d.priority) : '');
  h += row('Subject', renderRef(d.subject));
  h += row('Topic', ccFull(d.topic));
  (d.about || []).forEach((a) => h += row('About', renderRef(a)));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Sent', fmtDateTime(d.sent));
  h += row('Received', fmtDateTime(d.received));
  (d.recipient || []).forEach((r) => h += row('Recipient', renderRef(r)));
  h += row('Sender', renderRef(d.sender));
  (d.reasonCode || []).forEach((c) => h += row('Reason', ccFull(c)));
  if (d.payload?.length) {
    h += sub('📎 Payload');
    d.payload.forEach((p, i) => {
      if (p.contentString) h += row(`Content ${i + 1}`, escapeHtml(p.contentString));
      if (p.contentAttachment) h += row(`Attachment ${i + 1}`, escapeHtml(p.contentAttachment.title || p.contentAttachment.contentType || 'Attachment'));
      if (p.contentReference) h += row(`Reference ${i + 1}`, renderRef(p.contentReference));
    });
    h += subEnd();
  }
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

function renderCommunicationRequest(d) {
  let h = section('📨', 'Communication Request');
  h += row('Status', statusBadge(d.status));
  h += row('Status Reason', ccFull(d.statusReason));
  (d.category || []).forEach((c) => h += row('Category', ccFull(c)));
  h += row('Priority', d.priority ? statusBadge(d.priority) : '');
  h += row('Do Not Perform', d.doNotPerform !== undefined ? String(d.doNotPerform) : '');
  h += row('Subject', renderRef(d.subject));
  (d.about || []).forEach((a) => h += row('About', renderRef(a)));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Occurrence', d.occurrenceDateTime ? fmtDateTime(d.occurrenceDateTime) : d.occurrencePeriod ? period(d.occurrencePeriod) : '');
  h += row('Authored On', fmtDateTime(d.authoredOn));
  h += row('Requester', renderRef(d.requester));
  (d.recipient || []).forEach((r) => h += row('Recipient', renderRef(r)));
  h += row('Sender', renderRef(d.sender));
  (d.reasonCode || []).forEach((c) => h += row('Reason', ccFull(c)));
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

function renderConsent(d) {
  let h = section('📜', 'Consent');
  h += row('Status', statusBadge(d.status));
  h += row('Scope', ccFull(d.scope));
  (d.category || []).forEach((c) => h += row('Category', ccFull(c)));
  h += row('Patient', renderRef(d.patient));
  h += row('Date Time', fmtDateTime(d.dateTime));
  (d.performer || []).forEach((p) => h += row('Performer', renderRef(p)));
  (d.organization || []).forEach((o) => h += row('Organization', renderRef(o)));
  h += row('Source', renderRef(d.sourceAttachment) || renderRef(d.sourceReference));
  h += row('Policy Rule', ccFull(d.policyRule));
  if (d.provision) {
    h += sub('📋 Provision');
    h += row('Type', d.provision.type || '');
    h += row('Period', d.provision.period ? period(d.provision.period) : '');
    (d.provision.action || []).forEach((a) => h += row('Action', ccFull(a)));
    h += subEnd();
  }
  h += sectionEnd();
  return h;
}

function renderProvenance(d) {
  let h = section('🔏', 'Provenance');
  (d.target || []).forEach((t) => h += row('Target', renderRef(t)));
  h += row('Occurred', d.occurredDateTime ? fmtDateTime(d.occurredDateTime) : d.occurredPeriod ? period(d.occurredPeriod) : '');
  h += row('Recorded', fmtDateTime(d.recorded));
  (d.policy || []).forEach((p) => h += row('Policy', escapeHtml(p)));
  h += row('Location', renderRef(d.location));
  (d.reason || []).forEach((r) => h += row('Reason', ccFull(r)));
  h += row('Activity', ccFull(d.activity));
  if (d.agent?.length) {
    h += sub('👤 Agents');
    d.agent.forEach((a) => {
      h += row('Type', ccFull(a.type));
      (a.role || []).forEach((r) => h += row('Role', ccFull(r)));
      h += row('Who', renderRef(a.who));
      h += row('On Behalf Of', renderRef(a.onBehalfOf));
    });
    h += subEnd();
  }
  if (d.entity?.length) {
    h += sub('📄 Entity');
    d.entity.forEach((e) => {
      h += row('Role', e.role || '');
      h += row('What', renderRef(e.what));
    });
    h += subEnd();
  }
  h += sectionEnd();
  return h;
}

function renderAuditEvent(d) {
  let h = section('📋', 'Audit Event');
  h += row('Type', cc(d.type) || escapeHtml(d.type?.code || ''));
  (d.subtype || []).forEach((s) => h += row('Subtype', cc(s) || escapeHtml(s.code || '')));
  h += row('Action', d.action || '');
  h += row('Period', d.period ? period(d.period) : '');
  h += row('Recorded', fmtDateTime(d.recorded));
  h += row('Outcome', d.outcome ? statusBadge(d.outcome, d.outcome === '0' ? 'success' : 'error') : '');
  h += row('Outcome Desc', escapeHtml(d.outcomeDesc || ''));
  (d.purposeOfEvent || []).forEach((p) => h += row('Purpose', ccFull(p)));
  if (d.agent?.length) {
    h += sub('👤 Agents');
    d.agent.forEach((a) => {
      (a.type || []).forEach ? (Array.isArray(a.type) ? a.type : [a.type]).forEach((t) => h += row('Type', ccFull(t))) : h += row('Type', ccFull(a.type));
      (a.role || []).forEach((r) => h += row('Role', ccFull(r)));
      h += row('Who', renderRef(a.who));
      h += row('Alt ID', escapeHtml(a.altId || ''));
      h += row('Name', escapeHtml(a.name || ''));
      h += row('Requestor', a.requestor !== undefined ? String(a.requestor) : '');
      h += row('Location', renderRef(a.location));
    });
    h += subEnd();
  }
  if (d.source) {
    h += row('Source Site', escapeHtml(d.source.site || ''));
    h += row('Source Observer', renderRef(d.source.observer));
  }
  if (d.entity?.length) {
    h += sub('📄 Entity');
    d.entity.forEach((e) => {
      h += row('What', renderRef(e.what));
      h += row('Type', cc(e.type) || '');
      h += row('Role', cc(e.role) || '');
      h += row('Name', escapeHtml(e.name || ''));
      h += row('Description', escapeHtml(e.description || ''));
    });
    h += subEnd();
  }
  h += sectionEnd();
  return h;
}

function renderQuestionnaire(d) {
  let h = section('❓', 'Questionnaire');
  h += row('Status', statusBadge(d.status));
  h += row('Title', escapeHtml(d.title || ''));
  h += row('Description', escapeHtml(d.description || ''));
  h += row('Purpose', escapeHtml(d.purpose || ''));
  h += row('Date', fmtDateTime(d.date));
  h += row('Publisher', escapeHtml(d.publisher || ''));
  h += row('Version', escapeHtml(d.version || ''));
  (d.subjectType || []).forEach((s) => h += row('Subject Type', escapeHtml(s)));
  if (d.item?.length) {
    h += sub('📋 Items');
    renderQuestionnaireItems(d.item, 0).forEach(line => h += line);
    h += subEnd();
  }
  h += sectionEnd();
  return h;
}

function renderQuestionnaireItems(items, depth) {
  const lines = [];
  const indent = '  '.repeat(depth);
  (items || []).forEach((item, i) => {
    lines.push(row(`${indent}${i + 1}. ${item.linkId}`, escapeHtml(item.text || '') + (item.type ? ` [${item.type}]` : '')));
    if (item.item?.length) {
      lines.push(...renderQuestionnaireItems(item.item, depth + 1));
    }
  });
  return lines;
}

function renderQuestionnaireResponse(d) {
  let h = section('📝', 'Questionnaire Response');
  h += row('Status', statusBadge(d.status));
  h += row('Questionnaire', escapeHtml(d.questionnaire || ''));
  h += row('Subject', renderRef(d.subject));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Authored', fmtDateTime(d.authored));
  h += row('Author', renderRef(d.author));
  h += row('Source', renderRef(d.source));
  if (d.item?.length) {
    h += sub('📋 Answers');
    renderQRItems(d.item, 0).forEach(line => h += line);
    h += subEnd();
  }
  h += sectionEnd();
  return h;
}

function renderQRItems(items, depth) {
  const lines = [];
  const indent = '  '.repeat(depth);
  (items || []).forEach((item) => {
    let answer = '';
    if (item.answer?.length) {
      answer = item.answer.map(a => {
        if (a.valueString) return a.valueString;
        if (a.valueInteger !== undefined) return String(a.valueInteger);
        if (a.valueDecimal !== undefined) return String(a.valueDecimal);
        if (a.valueBoolean !== undefined) return String(a.valueBoolean);
        if (a.valueDate) return a.valueDate;
        if (a.valueDateTime) return a.valueDateTime;
        if (a.valueCoding) return cc(a.valueCoding) || a.valueCoding.code;
        if (a.valueQuantity) return quantity(a.valueQuantity);
        if (a.valueReference) return a.valueReference.reference || '';
        return '';
      }).join(', ');
    }
    lines.push(row(`${indent}${item.linkId}`, escapeHtml(answer || item.text || '')));
    if (item.item?.length) {
      lines.push(...renderQRItems(item.item, depth + 1));
    }
  });
  return lines;
}

function renderList(d) {
  let h = section('📋', 'List');
  h += row('Status', statusBadge(d.status));
  h += row('Mode', d.mode || '');
  h += row('Title', escapeHtml(d.title || ''));
  h += row('Code', ccFull(d.code));
  h += row('Subject', renderRef(d.subject));
  h += row('Encounter', renderRef(d.encounter));
  h += row('Date', fmtDateTime(d.date));
  h += row('Source', renderRef(d.source));
  h += row('Ordered By', ccFull(d.orderedBy));
  if (d.entry?.length) {
    h += sub('📄 Entries');
    d.entry.forEach((e, i) => {
      h += row(`#${i + 1}`, renderRef(e.item) || '');
      if (e.flag) h += row('Flag', ccFull(e.flag));
      if (e.deleted) h += row('Deleted', statusBadge('Yes', 'error'));
      if (e.date) h += row('Date', fmtDateTime(e.date));
    });
    h += subEnd();
  }
  h += row('Empty Reason', ccFull(d.emptyReason));
  (d.note || []).forEach((n) => h += row('Note', escapeHtml(n.text || '')));
  h += sectionEnd();
  return h;
}

function renderOperationOutcome(d) {
  let h = section('⚠️', 'Operation Outcome');
  if (d.issue?.length) {
    d.issue.forEach((issue, i) => {
      const severityClass = issue.severity === 'error' || issue.severity === 'fatal' ? 'error' : issue.severity === 'warning' ? 'warning' : 'info';
      h += row(`Issue ${i + 1}`, '');
      h += row('Severity', statusBadge(issue.severity, severityClass));
      h += row('Code', escapeHtml(issue.code || ''));
      h += row('Details', ccFull(issue.details));
      h += row('Diagnostics', escapeHtml(issue.diagnostics || ''));
      (issue.location || []).forEach((l) => h += row('Location', escapeHtml(l)));
      (issue.expression || []).forEach((e) => h += row('Expression', escapeHtml(e)));
    });
  }
  h += sectionEnd();
  return h;
}

function renderBundle(d) {
  let h = section('📦', 'Bundle');
  h += row('Type', statusBadge(d.type, 'info'));
  h += row('Total', d.total !== undefined ? String(d.total) : '');
  h += row('Timestamp', fmtDateTime(d.timestamp));
  if (d.link?.length) {
    h += sub('🔗 Links');
    d.link.forEach((l) => h += row(l.relation || 'Link', escapeHtml(l.url || '')));
    h += subEnd();
  }
  if (d.entry?.length) {
    h += sub('📄 Entries');
    d.entry.slice(0, 20).forEach((e, i) => {
      const res = e.resource;
      if (res) {
        h += row(`#${i + 1}`, `${res.resourceType || 'Unknown'}/${res.id || '?'}`);
      } else {
        h += row(`#${i + 1}`, e.fullUrl || 'No resource');
      }
    });
    if (d.entry.length > 20) h += row('...', `${d.entry.length - 20} more entries`);
    h += subEnd();
  }
  h += sectionEnd();
  return h;
}

function formatBytesSimple(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

// ─── Generic JSON fallback (non-FHIR) ───────────────────────────────────

function renderGenericJson(data) {
  let h = section('📋', 'JSON Data');

  if (Array.isArray(data)) {
    h += row('Type', statusBadge('Array', 'info'));
    h += row('Length', escapeHtml(String(data.length)));
    h += sub('📄 Items');
    data.slice(0, 30).forEach((item, i) => {
      if (typeof item === 'object' && item !== null) {
        const preview = JSON.stringify(item).substring(0, 100);
        h += row(`[${i}]`, `<span class="coding-system">${escapeHtml(preview)}${preview.length >= 100 ? '…' : ''}</span>`);
      } else {
        h += row(`[${i}]`, escapeHtml(String(item)));
      }
    });
    if (data.length > 30) h += row('...', `${data.length - 30} more items`);
    h += subEnd();
  } else if (typeof data === 'object' && data !== null) {
    h += row('Type', statusBadge('Object', 'info'));
    h += row('Keys', escapeHtml(String(Object.keys(data).length)));

    const keys = Object.keys(data).slice(0, 40);
    keys.forEach((key) => {
      const value = data[key];
      if (value === null) {
        h += row(key, '<span class="coding-system">null</span>');
      } else if (value === undefined) {
        h += row(key, '<span class="coding-system">undefined</span>');
      } else if (typeof value === 'boolean') {
        h += row(key, statusBadge(String(value), value ? 'success' : 'warning'));
      } else if (typeof value === 'number') {
        h += row(key, `<span class="json-number">${escapeHtml(String(value))}</span>`);
      } else if (typeof value === 'string') {
        // Truncate long strings
        const display = value.length > 150 ? value.substring(0, 150) + '…' : value;
        h += row(key, escapeHtml(display));
      } else if (Array.isArray(value)) {
        h += row(key, `<span class="coding-system">Array[${value.length}]</span>`);
      } else if (typeof value === 'object') {
        const preview = JSON.stringify(value).substring(0, 80);
        h += row(key, `<span class="coding-system">${escapeHtml(preview)}${preview.length >= 80 ? '…' : ''}</span>`);
      }
    });
    if (Object.keys(data).length > 40) h += row('...', `${Object.keys(data).length - 40} more fields`);
  } else {
    h += row('Value', escapeHtml(String(data)));
  }

  h += sectionEnd();
  h += `<div class="json-hint"><em>💡 Use the <strong>Tree</strong> or <strong>JSON</strong> view for full data exploration</em></div>`;
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
