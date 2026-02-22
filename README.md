# 🏥 HCX FHIR Viewer

A modern React-based viewer for HL7-FHIR R4 medical records with reference navigation, interactive JSON tree, inline attachments, and source file grouping.

![React](https://img.shields.io/badge/React-19-blue) ![FHIR](https://img.shields.io/badge/FHIR-R4-green) ![License](https://img.shields.io/badge/license-ISC-brightgreen)

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
cd hcx-fhir-util/frontend
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
hcx-fhir-util/
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
│   │   ├── utils/parser.js        # FHIR parsing (25+ types)
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

## 📊 Supported FHIR Resources (25+)

Patient · Practitioner · Organization · Observation · Condition · Procedure · Medication · MedicationRequest · Encounter · DiagnosticReport · AllergyIntolerance · Immunization · CarePlan · CareTeam · Claim · Coverage · Composition · DocumentReference · ServiceRequest · Appointment · Location · Device · Specimen · Goal · FamilyMemberHistory · Bundle

---

## 🔒 Privacy

- **100% Client-side** — No backend, no API calls
- **HIPAA-friendly** — PHI never leaves browser
- **Works offline** — After initial load

---

## 📄 License

ISC License
