import React, { useState, useRef, useEffect, useMemo } from 'react';
import { renderFormattedView } from '../utils/parser';
import JsonTreeViewer from './JsonTreeViewer';
import '../styles/components/ViewerPanel.css';

function ViewerPanel({ resource, viewMode, onViewModeChange, totalResources, onFileUpload, onNavigateToRef, onGoBack, canGoBack }) {
  const [copied, setCopied] = useState(false);
  const formattedViewRef = useRef();
  const jsonTreeRef = useRef();

  // Extract attachments from the resource
  const attachments = useMemo(() => {
    if (!resource?.data) return [];
    return extractAttachments(resource.data);
  }, [resource]);

  // Listen for clicks on .ref-link buttons inside the formatted HTML
  useEffect(() => {
    const container = formattedViewRef.current;
    if (!container || viewMode !== 'formatted') return;

    const handler = (e) => {
      const btn = e.target.closest('.ref-link');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const refValue = btn.getAttribute('data-ref');
        if (refValue && onNavigateToRef) {
          onNavigateToRef(refValue);
        }
      }
    };

    container.addEventListener('click', handler);
    return () => container.removeEventListener('click', handler);
  }, [resource, viewMode, onNavigateToRef]);

  const handleCopyJson = () => {
    if (resource?.json) {
      navigator.clipboard.writeText(resource.json).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleUploadClick = () => {
    document.getElementById('fileInput')?.click();
  };

  if (!resource) {
    return (
      <div className="viewer-panel">
        <div className="welcome-screen">
          <div className="welcome-graphic">
            <div className="welcome-ring ring-1"></div>
            <div className="welcome-ring ring-2"></div>
            <div className="welcome-icon-wrap">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
            </div>
          </div>
          <h2 className="welcome-title">
            {totalResources === 0 ? 'Load FHIR Resources' : 'Select a Resource'}
          </h2>
          <p className="welcome-desc">
            {totalResources === 0
              ? 'Upload JSON files, drag & drop, or paste FHIR data to begin exploring healthcare records.'
              : 'Click on a resource in the sidebar to view its details here.'}
          </p>
          {totalResources === 0 && (
            <div className="welcome-actions">
              <button className="btn btn-primary" onClick={handleUploadClick}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload Files
              </button>
            </div>
          )}
          <div className="welcome-shortcuts">
            <div className="shortcut"><kbd>Ctrl</kbd>+<kbd>O</kbd> Upload</div>
            <div className="shortcut"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> Paste</div>
            <div className="shortcut"><kbd>Ctrl</kbd>+<kbd>D</kbd> Dark Mode</div>
            <div className="shortcut"><kbd>↑</kbd><kbd>↓</kbd> Navigate</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="viewer-panel">
      <div className="viewer-header">
        <div className="viewer-meta">
          {canGoBack && (
            <button className="btn btn-ghost btn-sm btn-back" onClick={onGoBack} title="Go back to parent resource">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Back
            </button>
          )}
          <div className="viewer-type-badge">{resource.type}</div>
          <span className="viewer-id-text">ID: {resource.id}</span>
        </div>
        <div className="viewer-controls">
          <div className="view-toggle">
            <button
              className={`vt-btn ${viewMode === 'formatted' ? 'active' : ''}`}
              onClick={() => onViewModeChange('formatted')}
              title="Formatted view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              Formatted
            </button>
            <button
              className={`vt-btn ${viewMode === 'tree' ? 'active' : ''}`}
              onClick={() => onViewModeChange('tree')}
              title="Interactive JSON tree"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v6m0 0l-3-3m3 3l3-3"/>
                <rect x="3" y="14" width="6" height="6" rx="1"/>
                <rect x="15" y="14" width="6" height="6" rx="1"/>
                <path d="M6 14v-2h12v2"/>
              </svg>
              Tree
            </button>
            <button
              className={`vt-btn ${viewMode === 'json' ? 'active' : ''}`}
              onClick={() => onViewModeChange('json')}
              title="Plain JSON"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
              JSON
            </button>
          </div>
          {(viewMode === 'json' || viewMode === 'tree') && (
            <button className="btn btn-ghost btn-sm" onClick={handleCopyJson}>
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          )}
        </div>
      </div>

      <div className="viewer-body">
        {viewMode === 'formatted' && (
          <div
            ref={formattedViewRef}
            className="formatted-view"
          >
            <div dangerouslySetInnerHTML={{ __html: renderFormattedView(resource) }} />
            {attachments.length > 0 && (
              <InlineAttachments attachments={attachments} />
            )}
          </div>
        )}
        {viewMode === 'tree' && (
          <div className="json-view">
            <JsonTreeViewer
              ref={jsonTreeRef}
              data={resource.data}
              onNavigateToRef={onNavigateToRef}
            />
          </div>
        )}
        {viewMode === 'json' && (
          <div className="json-view plain-json">
            <pre className="json-code">{resource.json}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Inline Attachments component for formatted view
 */
function InlineAttachments({ attachments }) {
  const [expandedIdx, setExpandedIdx] = useState(null);

  return (
    <div className="section inline-attachments">
      <div className="section-header">📎 Attachments ({attachments.length})</div>
      <div className="attachment-list">
        {attachments.map((att, idx) => {
          const isExpanded = expandedIdx === idx;
          const dataUrl = att.data ? `data:${att.contentType};base64,${att.data}` : att.url;
          const category = getAttachmentCategory(att.contentType);
          const pathDisplay = att._path ? att._path.replace(/\[\d+\]/g, '[]') : '';

          return (
            <div key={idx} className="inline-attachment-item">
              <div
                className={`attachment-row ${isExpanded ? 'expanded' : ''}`}
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              >
                <span className="attachment-icon">{getFileIcon(att.contentType)}</span>
                <div className="attachment-info">
                  <span className="attachment-title">{att.title || `Attachment ${idx + 1}`}</span>
                  <div className="attachment-meta-row">
                    <span className="attachment-type">{att.contentType}</span>
                    {pathDisplay && (
                      <span className="attachment-path" title={att._path}>
                        📍 {pathDisplay}
                      </span>
                    )}
                  </div>
                </div>
                <div className="attachment-actions">
                  {dataUrl && (
                    <>
                      <a
                        href={dataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-xs"
                        onClick={(e) => e.stopPropagation()}
                        title="Open in new tab"
                      >
                        🔗 Open
                      </a>
                      <a
                        href={dataUrl}
                        download={att.title || `attachment.${getExtension(att.contentType)}`}
                        className="btn btn-ghost btn-xs"
                        onClick={(e) => e.stopPropagation()}
                        title="Download"
                      >
                        ⬇️ Download
                      </a>
                    </>
                  )}
                  <button className="btn btn-ghost btn-xs">
                    {isExpanded ? '▲ Hide' : '▼ Preview'}
                  </button>
                </div>
              </div>
              {isExpanded && dataUrl && (
                <div className="attachment-preview-inline">
                  {category === 'image' && (
                    <img src={dataUrl} alt={att.title || 'Attachment'} />
                  )}
                  {category === 'pdf' && (
                    <iframe src={dataUrl} title={att.title || 'PDF'} />
                  )}
                  {category === 'text' && att.data && (
                    <pre>{atob(att.data)}</pre>
                  )}
                  {category === 'audio' && (
                    <audio controls src={dataUrl} />
                  )}
                  {category === 'video' && (
                    <video controls src={dataUrl} />
                  )}
                  {(category === 'binary' || category === 'unknown') && (
                    <div className="binary-placeholder">
                      <p>Binary file - use Download to save</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getAttachmentCategory(contentType) {
  if (!contentType) return 'unknown';
  if (contentType.startsWith('image/')) return 'image';
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType.startsWith('text/') || contentType === 'application/json' || contentType === 'application/xml') return 'text';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType.startsWith('video/')) return 'video';
  return 'binary';
}

function getFileIcon(contentType) {
  if (!contentType) return '📄';
  if (contentType.startsWith('image/')) return '🖼️';
  if (contentType === 'application/pdf') return '📕';
  if (contentType.startsWith('text/')) return '📝';
  if (contentType === 'application/json') return '📋';
  if (contentType === 'application/xml') return '📰';
  if (contentType.startsWith('audio/')) return '🎵';
  if (contentType.startsWith('video/')) return '🎬';
  return '📎';
}

function getExtension(contentType) {
  const map = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp',
    'application/pdf': 'pdf', 'text/plain': 'txt', 'text/html': 'html',
    'application/json': 'json', 'application/xml': 'xml',
    'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'video/mp4': 'mp4', 'video/webm': 'webm',
  };
  return map[contentType] || 'bin';
}

/**
 * Extract all attachments from a FHIR resource
 */
function extractAttachments(data, path = '') {
  const attachments = [];

  function walk(node, currentPath) {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      node.forEach((item, idx) => walk(item, `${currentPath}[${idx}]`));
      return;
    }

    // Check if this is an Attachment object
    if (node.contentType && (node.data || node.url)) {
      attachments.push({
        ...node,
        _path: currentPath
      });
    }

    // Continue walking
    Object.entries(node).forEach(([key, value]) => {
      walk(value, currentPath ? `${currentPath}.${key}` : key);
    });
  }

  walk(data, '');
  return attachments;
}

export default ViewerPanel;

