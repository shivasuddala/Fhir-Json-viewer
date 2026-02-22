import React, { useRef } from 'react';
import '../styles/components/Header.css';

function Header({ resourceCount, onFileUpload, darkMode, onToggleDarkMode, onPasteClick, onExport, onClearAll }) {
  const fileRef = useRef();

  const handleFileChange = (e) => {
    if (e.target.files?.length > 0) {
      onFileUpload(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="brand-logo">
            <span className="logo-icon">🏥</span>
          </div>
          <div className="brand-text">
            <h1>HCX FHIR Viewer</h1>
            <p>Healthcare Data Visualization</p>
          </div>
        </div>

        <div className="header-center">
          <div className="stat-pill">
            <span className="stat-dot"></span>
            <span className="stat-text">{resourceCount} Resource{resourceCount !== 1 ? 's' : ''} Loaded</span>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-header" onClick={() => fileRef.current?.click()} title="Upload Files (Ctrl+O)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Upload</span>
          </button>

          <button className="btn btn-header" onClick={onPasteClick} title="Paste JSON (Ctrl+Shift+V)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
            <span>Paste</span>
          </button>

          <button className="btn btn-header" onClick={onExport} title="Export as Bundle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Export</span>
          </button>

          {resourceCount > 0 && (
            <button className="btn btn-header btn-header-danger" onClick={onClearAll} title="Clear All">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          )}

          <div className="header-divider"></div>

          <button
            className="btn btn-header btn-theme-toggle"
            onClick={onToggleDarkMode}
            title={`Switch to ${darkMode ? 'Light' : 'Dark'} Mode (Ctrl+D)`}
          >
            {darkMode ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        id="fileInput"
        type="file"
        accept=".json"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </header>
  );
}

export default Header;
