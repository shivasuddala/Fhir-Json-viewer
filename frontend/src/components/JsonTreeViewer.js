import React, { useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import '../styles/components/JsonTreeViewer.css';

/**
 * Interactive JSON Tree Viewer with expand/collapse and clickable references
 */
const JsonTreeViewer = forwardRef(({ data, onNavigateToRef }, ref) => {
  const [expandAll, setExpandAll] = useState(null); // null = default, true = expand all, false = collapse all
  const [expandKey, setExpandKey] = useState(0); // force re-render on expand/collapse all

  const handleExpandAll = useCallback(() => {
    setExpandAll(true);
    setExpandKey(k => k + 1);
  }, []);

  const handleCollapseAll = useCallback(() => {
    setExpandAll(false);
    setExpandKey(k => k + 1);
  }, []);

  const handleResetExpand = useCallback(() => {
    setExpandAll(null);
    setExpandKey(k => k + 1);
  }, []);

  useImperativeHandle(ref, () => ({
    expandAll: handleExpandAll,
    collapseAll: handleCollapseAll,
    reset: handleResetExpand
  }));

  return (
    <div className="json-tree-container">
      <div className="json-tree-toolbar">
        <button className="json-tree-toolbar-btn" onClick={handleExpandAll} title="Expand all nodes">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 4 L6 8 L10 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Expand All
        </button>
        <button className="json-tree-toolbar-btn" onClick={handleCollapseAll} title="Collapse all nodes">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 8 L6 4 L10 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Collapse All
        </button>
        <button className="json-tree-toolbar-btn" onClick={handleResetExpand} title="Reset to default (2 levels)">
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6 L10 6 M6 2 L6 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Reset
        </button>
      </div>
      <div className="json-tree">
        <JsonNode
          key={expandKey}
          name={null}
          value={data}
          depth={0}
          onNavigateToRef={onNavigateToRef}
          forceExpand={expandAll}
        />
      </div>
    </div>
  );
});

JsonTreeViewer.displayName = 'JsonTreeViewer';

function JsonNode({ name, value, depth, onNavigateToRef, forceExpand }) {
  // Determine initial expanded state
  const getInitialExpanded = () => {
    if (forceExpand === true) return true;
    if (forceExpand === false) return false;
    return depth < 2; // default: expand first 2 levels
  };

  const [expanded, setExpanded] = useState(getInitialExpanded);

  const type = getType(value);
  const isExpandable = type === 'object' || type === 'array';
  const isEmpty = isExpandable && (
    (type === 'object' && Object.keys(value).length === 0) ||
    (type === 'array' && value.length === 0)
  );

  const toggleExpand = useCallback((e) => {
    e.stopPropagation();
    setExpanded(prev => !prev);
  }, []);

  // Check if this is a FHIR reference
  const isReference = name === 'reference' && typeof value === 'string';
  const isReferenceValue = isReference && isFhirReference(value);

  // Check if this is a URL
  const isUrl = typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));

  // Check if this is base64 data (attachment)
  const isBase64Data = name === 'data' && typeof value === 'string' && value.length > 100 && isLikelyBase64(value);

  const handleRefClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNavigateToRef) {
      onNavigateToRef(value);
    }
  }, [value, onNavigateToRef]);

  // Handle base64 download
  const handleBase64Download = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Try to get contentType from sibling
    const blob = base64ToBlob(value, 'application/octet-stream');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attachment';
    a.click();
    URL.revokeObjectURL(url);
  }, [value]);

  // Render the key/name part
  const renderName = () => {
    if (name === null) return null;
    return <span className="json-tree-key">"{name}"</span>;
  };

  // Render primitive values
  const renderPrimitive = () => {
    if (type === 'string') {
      // Base64 data - show truncated with download button
      if (isBase64Data) {
        const truncated = value.substring(0, 50) + '...';
        return (
          <span className="json-tree-string json-tree-base64">
            "{truncated}"
            <button
              className="json-tree-download-btn"
              onClick={handleBase64Download}
              title="Download attachment"
            >
              ⬇️ Download
            </button>
            <span className="json-tree-base64-size">({formatBytes(value.length * 0.75)})</span>
          </span>
        );
      }
      if (isReferenceValue) {
        return (
          <span className="json-tree-string">
            "<button
              className="json-tree-ref-btn"
              onClick={handleRefClick}
              title={`Navigate to ${value}`}
            >{value}</button>"
          </span>
        );
      }
      if (isUrl) {
        return (
          <span className="json-tree-string">
            "<a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="json-tree-url"
              title="Open in new tab"
            >{value}</a>"
          </span>
        );
      }
      return <span className="json-tree-string">"{escapeString(value)}"</span>;
    }
    if (type === 'number') {
      return <span className="json-tree-number">{value}</span>;
    }
    if (type === 'boolean') {
      return <span className="json-tree-boolean">{value.toString()}</span>;
    }
    if (type === 'null') {
      return <span className="json-tree-null">null</span>;
    }
    return null;
  };

  // Render expandable (object/array)
  if (isExpandable) {
    const entries = type === 'object' ? Object.entries(value) : value.map((v, i) => [i, v]);
    const bracketOpen = type === 'object' ? '{' : '[';
    const bracketClose = type === 'object' ? '}' : ']';
    const itemCount = entries.length;

    if (isEmpty) {
      return (
        <div className="json-tree-node" style={{ '--depth': depth }}>
          {renderName()}
          {name !== null && <span className="json-tree-colon">: </span>}
          <span className="json-tree-bracket">{bracketOpen}{bracketClose}</span>
        </div>
      );
    }

    return (
      <div className="json-tree-node" style={{ '--depth': depth }}>
        <div className="json-tree-line">
          <button
            className={`json-tree-toggle ${expanded ? 'expanded' : 'collapsed'}`}
            onClick={toggleExpand}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          {renderName()}
          {name !== null && <span className="json-tree-colon">: </span>}
          <span className="json-tree-bracket">{bracketOpen}</span>
          {!expanded && (
            <>
              <span className="json-tree-preview">
                {type === 'array' ? `${itemCount} items` : `${itemCount} keys`}
              </span>
              <span className="json-tree-bracket">{bracketClose}</span>
            </>
          )}
        </div>
        {expanded && (
          <div className="json-tree-children">
            {entries.map(([key, val], index) => (
              <div key={key} className="json-tree-child">
                <JsonNode
                  name={type === 'object' ? key : null}
                  value={val}
                  depth={depth + 1}
                  onNavigateToRef={onNavigateToRef}
                  forceExpand={forceExpand}
                />
                {index < entries.length - 1 && <span className="json-tree-comma">,</span>}
              </div>
            ))}
            <div className="json-tree-close-bracket">
              <span className="json-tree-bracket">{bracketClose}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render primitive
  return (
    <div className="json-tree-node json-tree-primitive" style={{ '--depth': depth }}>
      {renderName()}
      {name !== null && <span className="json-tree-colon">: </span>}
      {renderPrimitive()}
    </div>
  );
}

// Helper functions
function getType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function isFhirReference(str) {
  // ResourceType/id pattern
  if (/^[A-Z][a-zA-Z]+\/[a-zA-Z0-9\-\.]+$/.test(str)) return true;
  // URL with resource pattern
  if (/^(http|https):\/\/.*\/[A-Z][a-zA-Z]+\/[a-zA-Z0-9\-\.]+$/.test(str)) return true;
  // URN pattern
  if (/^urn:uuid:[a-f0-9\-]+$/i.test(str)) return true;
  return false;
}

function escapeString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function isLikelyBase64(str) {
  // Check if string looks like base64 (only valid base64 chars)
  if (!/^[A-Za-z0-9+/=]+$/.test(str)) return false;
  // Length should be multiple of 4
  return str.length % 4 === 0;
}

function base64ToBlob(base64, contentType = 'application/octet-stream') {
  try {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  } catch {
    return new Blob([base64], { type: 'text/plain' });
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default JsonTreeViewer;

