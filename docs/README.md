# HCX FHIR Viewer — Documentation

## Overview

HCX FHIR Viewer is a 100% client-side React application for viewing and exploring HL7-FHIR R4 medical records. It supports NRCES FHIR profiles used in the Indian National Digital Health Mission (NDHM).

**No backend server required** — all processing happens in the browser.

---

## Getting Started

### Prerequisites
- Node.js 14+ 
- npm 6+

### Installation

```bash
cd frontend
npm install
npm start
```

The application opens at **http://localhost:3000**

---

## View Modes

### 1. Formatted View
Human-readable display with structured sections, clickable references, and badges for status fields.

### 2. JSON Tree View
Interactive expandable/collapsible JSON tree:
- Click arrows to expand/collapse nodes
- **Expand All** / **Collapse All** / **Reset** buttons
- Clickable FHIR references for navigation
- URLs open in new tabs
- Syntax highlighting for keys, strings, numbers, booleans

### 3. Plain JSON View
Raw JSON text with monospace font, useful for copying.

### 4. Attachment Viewer
View embedded files from FHIR Attachment objects:
- **Images**: PNG, JPEG, GIF, WebP, SVG
- **Documents**: PDF (embedded viewer)
- **Text**: Plain text, HTML, XML, JSON
- **Audio**: MP3, WAV (with player)
- **Video**: MP4, WebM (with player)
- Download and Open in New Tab buttons

---

## Navigation

### Reference Links
Click on any FHIR reference (e.g., `Patient/patient-001`) to navigate to that resource. Works in both Formatted and Tree views.

### Back Button
After navigating via a reference, click "Back" to return to the parent resource.

### Supported Reference Formats
- `ResourceType/id` → `Patient/patient-001`
- Full URL → `http://example.com/fhir/Patient/123`
- URN → `urn:uuid:550e8400-e29b-41d4-a716-446655440000`

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open file upload |
| `Ctrl+Shift+V` | Open paste modal |
| `Ctrl+D` | Toggle dark mode |
| `↑` / `↓` | Navigate resource list |
| `Esc` | Close modal |

---

## Supported FHIR Resources

The parser includes dedicated formatters for 25+ resource types:

| Category | Resources |
|----------|-----------|
| **Patient/Clinical** | Patient, Practitioner, PractitionerRole, Organization, Encounter |
| **Observations** | Observation (with components, reference ranges), DiagnosticReport |
| **Conditions** | Condition, AllergyIntolerance, FamilyMemberHistory |
| **Medications** | Medication, MedicationRequest, MedicationStatement, MedicationAdministration |
| **Procedures** | Procedure, Immunization, ServiceRequest |
| **Care** | CarePlan, CareTeam, Goal, Appointment |
| **Financial** | Claim, Coverage |
| **Documents** | Composition, DocumentReference, Bundle |
| **Infrastructure** | Location, Device, Specimen |

---

## Why No Backend?

This application is intentionally **100% client-side** for these reasons:

1. **Privacy**: PHI (Protected Health Information) never leaves the browser
2. **Security**: No server means no attack surface for data breaches
3. **HIPAA Compliance**: No data transmission, storage, or logging
4. **Offline Capable**: Works without internet after initial load
5. **Simple Deployment**: Just static files, no server infrastructure needed

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| File won't upload | Ensure valid JSON with `resourceType` field |
| Reference navigation not working | The referenced resource must be loaded |
| Attachment not displaying | Check `contentType` and `data`/`url` fields |
| Port 3000 in use | Stop other process or edit `webpack.config.js` |

---

## License

ISC License
