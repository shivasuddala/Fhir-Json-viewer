import React, { useState, useEffect, useRef } from 'react';
import '../styles/components/PastePanel.css';

function PastePanel({ onParseAndAdd, onClose }) {
  const [jsonText, setJsonText] = useState('');
  const textareaRef = useRef();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleParse = () => {
    if (jsonText.trim() === '') return;
    onParseAndAdd(jsonText);
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleParse();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="paste-modal" onClick={(e) => e.stopPropagation()}>
        <div className="paste-modal-header">
          <div className="pm-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
            <h3>Paste FHIR JSON</h3>
          </div>
          <button className="pm-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="paste-modal-body">
          <textarea
            ref={textareaRef}
            className="paste-textarea"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Paste a FHIR resource, Bundle, or array of resources...\n\nExample:\n{\n  "resourceType": "Patient",\n  "id": "patient-123",\n  "name": [{ "given": ["John"], "family": "Doe" }]\n}`}
            spellCheck={false}
          />
        </div>

        <div className="paste-modal-footer">
          <span className="pm-hint">Ctrl+Enter to parse</span>
          <div className="pm-actions">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleParse} disabled={!jsonText.trim()}>
              Parse & Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PastePanel;

