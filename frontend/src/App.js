import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import SidePanel from './components/SidePanel';
import PastePanel from './components/PastePanel';
import ViewerPanel from './components/ViewerPanel';
import Notification from './components/Notification';
import { parseJson } from './utils/parser';
import './App.css';

function App() {
  const [resources, setResources] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('formatted');
  const [darkMode, setDarkMode] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [isDragging, setIsDragging] = useState(false);
  const [navStack, setNavStack] = useState([]); // for reference navigation back

  // Apply dark mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        document.getElementById('fileInput')?.click();
      }
      if (e.ctrlKey && e.key === 'v' && e.shiftKey) {
        e.preventDefault();
        setShowPasteModal(true);
      }
      if (e.key === 'Escape') {
        setShowPasteModal(false);
      }
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        setDarkMode((prev) => !prev);
      }
      // Arrow up/down to navigate resources
      if (e.key === 'ArrowDown' && selectedIndex !== null) {
        e.preventDefault();
        const max = getFilteredResources().length - 1;
        const currentFiltered = getFilteredResourceIndex();
        if (currentFiltered < max) {
          selectFilteredResource(currentFiltered + 1);
        }
      }
      if (e.key === 'ArrowUp' && selectedIndex !== null) {
        e.preventDefault();
        const currentFiltered = getFilteredResourceIndex();
        if (currentFiltered > 0) {
          selectFilteredResource(currentFiltered - 1);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIndex, resources, filterType, searchTerm]);

  const showNotification = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  const getFilteredResources = useCallback(() => {
    return resources.filter((r) => {
      const matchesType = filterType === 'All' || r.type === filterType;
      const matchesSearch =
        r.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [resources, filterType, searchTerm]);

  const getFilteredResourceIndex = useCallback(() => {
    const filtered = getFilteredResources();
    return filtered.findIndex((r) => r === resources[selectedIndex]);
  }, [getFilteredResources, resources, selectedIndex]);

  const selectFilteredResource = useCallback(
    (filteredIdx) => {
      const filtered = getFilteredResources();
      const actualIdx = resources.findIndex((r) => r === filtered[filteredIdx]);
      setSelectedIndex(actualIdx);
    },
    [getFilteredResources, resources]
  );

  const handleFileUpload = useCallback(
    (files) => {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const json = JSON.parse(e.target.result);
            const sourceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const source = { name: file.name, id: sourceId };
            const newResources = parseJson(json, source);
            if (newResources.length === 0) {
              showNotification(`No FHIR resources found in ${file.name}`, 'warning');
              return;
            }
            setResources((prev) => [...prev, ...newResources]);
            showNotification(`Loaded ${newResources.length} resource(s) from ${file.name}`);
            if (newResources.length > 0 && selectedIndex === null) {
              setSelectedIndex(0);
            }
          } catch {
            showNotification(`Invalid JSON in ${file.name}`, 'error');
          }
        };
        reader.readAsText(file);
      });
    },
    [showNotification, selectedIndex]
  );

  const handleParseAndAdd = useCallback(
    (jsonText) => {
      try {
        const json = JSON.parse(jsonText);
        const sourceId = `paste-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const source = { name: 'Pasted JSON', id: sourceId };
        const newResources = parseJson(json, source);
        if (newResources.length === 0) {
          showNotification('No valid FHIR resources found', 'error');
          return false;
        }
        setResources((prev) => [...prev, ...newResources]);
        showNotification(`Added ${newResources.length} resource(s)`);
        setShowPasteModal(false);
        return true;
      } catch (err) {
        showNotification(`Invalid JSON: ${err.message}`, 'error');
        return false;
      }
    },
    [showNotification]
  );

  const handleDeleteResource = useCallback(
    (idx) => {
      setResources((prev) => prev.filter((_, i) => i !== idx));
      if (selectedIndex === idx) {
        setSelectedIndex(null);
      } else if (selectedIndex > idx) {
        setSelectedIndex((prev) => prev - 1);
      }
      showNotification('Resource removed', 'info');
    },
    [selectedIndex, showNotification]
  );

  const handleDeleteSourceGroup = useCallback(
    (sourceId) => {
      const countToRemove = resources.filter((r) => r.source?.id === sourceId).length;
      setResources((prev) => prev.filter((r) => r.source?.id !== sourceId));
      setSelectedIndex(null);
      showNotification(`Removed ${countToRemove} resource(s)`, 'info');
    },
    [resources, showNotification]
  );

  const handleClearAll = useCallback(() => {
    setResources([]);
    setSelectedIndex(null);
    setFilterType('All');
    setSearchTerm('');
    showNotification('All resources cleared', 'info');
  }, [showNotification]);

  const handleExportAll = useCallback(() => {
    if (resources.length === 0) {
      showNotification('No resources to export', 'warning');
      return;
    }
    const bundle = {
      resourceType: 'Bundle',
      type: 'collection',
      total: resources.length,
      entry: resources.map((r) => ({ resource: r.data })),
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fhir-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`Exported ${resources.length} resource(s) as Bundle`);
  }, [resources, showNotification]);

  // Navigate to a referenced resource (e.g. "Patient/patient-001", "urn:uuid:xxx", etc.)
  const handleNavigateToRef = useCallback(
    (refString) => {
      if (!refString) return;

      // Handle different reference formats:
      // 1. "ResourceType/id" (e.g. "Patient/patient-001")
      // 2. Full URL (e.g. "http://example.com/Patient/123")
      // 3. URN (e.g. "urn:uuid:xxxx")
      // 4. Just an ID

      let refType = null;
      let refId = refString;

      // Strip full URLs to get ResourceType/id part
      if (refString.includes('://')) {
        const urlParts = refString.split('/');
        // Look for ResourceType pattern (starts with capital letter)
        for (let i = urlParts.length - 2; i >= 0; i--) {
          if (/^[A-Z][a-zA-Z]+$/.test(urlParts[i])) {
            refType = urlParts[i];
            refId = urlParts.slice(i + 1).join('/');
            break;
          }
        }
        if (!refType) {
          refId = urlParts[urlParts.length - 1];
        }
      } else if (refString.startsWith('urn:uuid:')) {
        refId = refString.replace('urn:uuid:', '');
      } else if (refString.includes('/')) {
        const parts = refString.split('/');
        if (parts.length >= 2) {
          refType = parts[parts.length - 2];
          refId = parts[parts.length - 1];
        }
      }

      // Search for the resource
      const idx = resources.findIndex((r) => {
        // Match by id
        if (r.id === refId) {
          // If we have a type constraint, also check type
          return refType ? r.type === refType : true;
        }
        // Also check full reference format "Type/id" against data
        return false;
      });

      if (idx !== -1) {
        // Push current index onto navStack before navigating
        if (selectedIndex !== null) {
          setNavStack((prev) => [...prev, selectedIndex]);
        }
        setSelectedIndex(idx);
        showNotification(`Navigated to ${resources[idx].type}/${resources[idx].id}`, 'info');
      } else {
        showNotification(`Referenced resource not found: ${refString}`, 'warning');
      }
    },
    [resources, selectedIndex, showNotification]
  );

  const handleGoBack = useCallback(() => {
    setNavStack((prev) => {
      if (prev.length === 0) return prev;
      const stack = [...prev];
      const backIdx = stack.pop();
      setSelectedIndex(backIdx);
      return stack;
    });
  }, []);

  // Drag & drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload]
  );

  // Resource type counts for filter chips
  const resourceTypeCounts = resources.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  const filteredResources = getFilteredResources();

  return (
    <div
      className="app"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Header
        resourceCount={resources.length}
        onFileUpload={handleFileUpload}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        onPasteClick={() => setShowPasteModal(true)}
        onExport={handleExportAll}
        onClearAll={handleClearAll}
      />

      <div className="main-container">
        <SidePanel
          resources={filteredResources}
          allResources={resources}
          selectedIndex={selectedIndex}
          onSelectResource={(filteredIdx) => selectFilteredResource(filteredIdx)}
          onDeleteResource={(filteredIdx) => {
            const actual = resources.findIndex((r) => r === filteredResources[filteredIdx]);
            handleDeleteResource(actual);
          }}
          onDeleteSourceGroup={handleDeleteSourceGroup}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          resourceTypeCounts={resourceTypeCounts}
        />
        <ViewerPanel
          resource={selectedIndex !== null ? resources[selectedIndex] : null}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalResources={resources.length}
          onFileUpload={handleFileUpload}
          onNavigateToRef={handleNavigateToRef}
          onGoBack={handleGoBack}
          canGoBack={navStack.length > 0}
        />
      </div>

      {/* Paste Modal */}
      {showPasteModal && (
        <PastePanel
          onParseAndAdd={handleParseAndAdd}
          onClose={() => setShowPasteModal(false)}
        />
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <span className="drag-icon">📂</span>
            <h3>Drop FHIR JSON files here</h3>
            <p>Release to upload and parse</p>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="notification-stack">
        {notifications.map((n) => (
          <Notification
            key={n.id}
            message={n.message}
            type={n.type}
            onDismiss={() =>
              setNotifications((prev) => prev.filter((x) => x.id !== n.id))
            }
          />
        ))}
      </div>
    </div>
  );
}

export default App;

