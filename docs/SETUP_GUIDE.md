# Setup Guide

## Prerequisites

- **Node.js** 14+ ([download](https://nodejs.org/))
- **npm** 6+ (included with Node.js)

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repository-url>
cd hcx-fhir-util/frontend
npm install
```

### 2. Start Development Server

```bash
npm start
```

Opens at **http://localhost:3000**

### 3. Build for Production

```bash
npm run build
```

Output is in `frontend/dist/` — deploy to any static host.

---

## Windows Quick Start

Double-click `scripts/start-dev.bat` to install and start the dev server.

---

## Configuration

### Change Dev Server Port

Edit `frontend/webpack.config.js`:

```javascript
devServer: {
  port: 3001,  // change from 3000
  ...
}
```

---

## Project Scripts

Run from `frontend/` directory:

| Command | Description |
|---------|-------------|
| `npm start` | Start dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run dev` | Development build (no server) |

---

## Folder Structure

```
frontend/
├── public/
│   └── index.html        # HTML template
├── src/
│   ├── components/       # React components
│   ├── styles/           # CSS files
│   ├── utils/            # Parser utilities
│   ├── App.js            # Main app component
│   └── index.js          # Entry point
├── package.json          # Dependencies
└── webpack.config.js     # Build config
```

---

## Testing Sample Data

1. Start the application
2. Upload `samples/sample-bundle.json`
3. Click on Observation → click "Subject" reference → navigates to Patient
4. Click "Back" to return

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `npm start` fails | Delete `node_modules`, run `npm install` |
| Port 3000 in use | Kill process: `npx kill-port 3000` |
| Module not found | Run `npm install` |
| Build errors | Check Node.js version ≥14 |
