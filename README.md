# 🏥 HCX FHIR Viewer

A modern React-based viewer for HL7-FHIR R4 medical records with reference navigation, interactive JSON tree, inline attachments, and source file grouping. Supports **NRCES India** and **HL7 International** FHIR profiles.

![React](https://img.shields.io/badge/React-19-blue) ![FHIR](https://img.shields.io/badge/FHIR-R4-green) ![NRCES](https://img.shields.io/badge/NRCES-India-orange) ![License](https://img.shields.io/badge/license-ISC-brightgreen)

## 🌐 Live Demo

👉 **[https://shivasuddala.github.io/Fhir-Json-viewer/](https://shivasuddala.github.io/Fhir-Json-viewer/)**

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📁 **File Upload** | Upload JSON files via click or drag-and-drop |
| 📂 **Source Grouping** | Resources grouped by source file with collapse/expand |
| 📋 **Paste JSON** | Paste FHIR resources via modal dialog |
| 🔗 **Reference Navigation** | Click references to navigate to linked resources |
| ⬅️ **Back Navigation** | Return to parent resource with Back button |
| 🌗 **Dark/Light Mode** | Toggle themes with Ctrl+D |
| 📊 **Formatted View** | Human-readable display with inline attachments |
| 🌳 **JSON Tree View** | Interactive expand/collapse with download buttons |
| 📝 **Plain JSON View** | Raw JSON for copying |
| 📎 **Inline Attachments** | View/download images, PDFs, text, audio, video |
| 🔍 **Search & Filter** | Real-time filtering by type or ID |
| 📤 **Export Bundle** | Export all resources as FHIR Bundle |
| 🔒 **100% Client-side** | No data leaves your browser |

---

## 🚀 Quick Start

```bash
cd frontend
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
Fhir-Json-viewer/
├── frontend/
│   ├── public/index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.js
│   │   │   ├── SidePanel.js       # Grouped resource list
│   │   │   ├── ViewerPanel.js     # Main viewer with attachments
│   │   │   ├── JsonTreeViewer.js  # Interactive JSON tree
│   │   │   ├── PastePanel.js
│   │   │   └── Notification.js
│   │   ├── styles/
│   │   ├── utils/parser.js        # FHIR parsing (70+ types)
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── webpack.config.js
├── samples/                        # Test FHIR files
├── docs/
│   ├── README.md
│   └── SETUP_GUIDE.md
└── README.md
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Upload files |
| `Ctrl+Shift+V` | Paste JSON |
| `Ctrl+D` | Toggle dark mode |
| `↑` / `↓` | Navigate resources |
| `Esc` | Close modal |

---

## 📎 Attachment Support

**Formatted View**: Attachments shown at bottom with path indicator  
**JSON Tree**: Base64 data fields show download button with size

| Type | Preview | Download |
|------|---------|----------|
| Images (PNG, JPEG, GIF) | ✅ | ✅ |
| PDF | ✅ (iframe) | ✅ |
| Text/JSON/XML | ✅ | ✅ |
| Audio (MP3, WAV) | ✅ (player) | ✅ |
| Video (MP4, WebM) | ✅ (player) | ✅ |
| Binary | ❌ | ✅ |

---

## 📊 Supported FHIR Resource Types (70+)

### Core Clinical
Patient · Practitioner · PractitionerRole · Organization · Observation · Condition · Procedure · Encounter · EpisodeOfCare

### Medication
Medication · MedicationRequest · MedicationStatement · MedicationAdministration · MedicationDispense

### Diagnostics
DiagnosticReport · ImagingStudy · Media · Specimen

### Allergy & Immunization
AllergyIntolerance · Immunization · ImmunizationRecommendation

### Documents
Composition · DocumentReference · DocumentManifest · Binary

### Financial (HCX India)
Claim · ClaimResponse · Coverage · CoverageEligibilityRequest · CoverageEligibilityResponse · ExplanationOfBenefit · PaymentNotice · PaymentReconciliation · InsurancePlan

### Care Planning
ServiceRequest · CarePlan · CareTeam · Goal · NutritionOrder · VisionPrescription · RiskAssessment

### Scheduling
Appointment · AppointmentResponse · Schedule · Slot

### Devices
Device · DeviceRequest · DeviceUseStatement

### Administrative
Location · HealthcareService · RelatedPerson · Person · Group

### Clinical Reasoning
FamilyMemberHistory · ClinicalImpression · DetectedIssue · AdverseEvent · Flag

### Workflow
Task · Communication · CommunicationRequest · Consent · Provenance · AuditEvent

### Questionnaire
Questionnaire · QuestionnaireResponse

### Lists & Other
List · OperationOutcome · Bundle

### NRCES India Profiles
Supports NRCES India FHIR R4 profiles including:
- OPConsultRecord
- PrescriptionRecord
- DiagnosticReportRecord
- DischargeSummaryRecord
- ImmunizationRecord
- WellnessRecord
- HealthDocumentBundle

---

## 🇮🇳 NRCES India Support

This viewer supports the **National Resource Centre for EHR Standards (NRCES)** India FHIR R4 profiles used in:

- **ABDM (Ayushman Bharat Digital Mission)**
- **HCX (Health Claims Exchange)**
- **National Digital Health Mission**

Reference: [https://nrces.in/ndhm/fhir/r4/](https://nrces.in/ndhm/fhir/r4/)

---

## 🌍 HL7 FHIR R4 Support

Fully compatible with standard HL7 FHIR R4 resources from:

- [HL7 FHIR R4](https://hl7.org/fhir/R4/)
- [US Core](https://www.hl7.org/fhir/us/core/)
- [International Patient Summary](https://hl7.org/fhir/uv/ips/)

---

## 🔒 Privacy

- **100% Client-side** — No backend, no API calls
- **HIPAA-friendly** — PHI never leaves browser
- **Works offline** — After initial load
- **No data collection** — Your data stays on your device

---

## 🛠️ Development

```bash
# Install dependencies
cd frontend
npm install

# Development server (hot reload)
npm start

# Production build
npm run build
```

---

## 📄 License

ISC License

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📧 Author

**Shiva Suddala**

- GitHub: [@shivasuddala](https://github.com/shivasuddala)

