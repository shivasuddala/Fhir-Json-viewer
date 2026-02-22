import React, { useMemo, useState } from 'react';
import { getResourceIcon } from '../utils/parser';
import '../styles/components/SidePanel.css';

function SidePanel({
  resources,
  allResources,
  selectedIndex,
  onSelectResource,
  onDeleteResource,
  searchTerm,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  resourceTypeCounts,
  onDeleteSourceGroup,
}) {
  const types = Object.keys(resourceTypeCounts).sort();
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Group resources by source
  const groupedResources = useMemo(() => {
    const groups = {};
    resources.forEach((resource, idx) => {
      const sourceId = resource.source?.id || 'unknown';
      const sourceName = resource.source?.name || 'Unknown Source';
      if (!groups[sourceId]) {
        groups[sourceId] = { name: sourceName, id: sourceId, resources: [] };
      }
      groups[sourceId].resources.push({ resource, filteredIndex: idx });
    });
    return Object.values(groups);
  }, [resources]);

  const toggleGroup = (groupId) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <aside className="side-panel">
      <div className="side-panel-header">
        <div className="sp-title-row">
          <h2>Resources</h2>
          <span className="sp-count">{allResources.length}</span>
        </div>
        <div className="sp-search">
          <svg
            className="sp-search-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by type or ID..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="sp-search-input"
          />
          {searchTerm && (
            <button
              className="sp-search-clear"
              onClick={() => onSearchChange('')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {types.length > 0 && (
        <div className="filter-chips">
          <button
            className={`filter-chip ${filterType === 'All' ? 'active' : ''}`}
            onClick={() => onFilterTypeChange('All')}
          >
            All <span className="chip-count">{allResources.length}</span>
          </button>
          {types.map((type) => (
            <button
              key={type}
              className={`filter-chip ${filterType === type ? 'active' : ''}`}
              onClick={() => onFilterTypeChange(type)}
            >
              <span className="chip-icon">{getResourceIcon(type)}</span>
              {type}
              <span className="chip-count">{resourceTypeCounts[type]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="resources-list">
        {resources.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--text-muted)' }}
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <p className="empty-title">No resources loaded</p>
            <p className="empty-sub">
              Upload JSON files or paste FHIR data to get started
            </p>
          </div>
        ) : (
          groupedResources.map((group) => {
            const isCollapsed = collapsedGroups[group.id];
            return (
              <div key={group.id} className="resource-group">
                <div
                  className="resource-group-header"
                  onClick={() => toggleGroup(group.id)}
                >
                  <button
                    className={`group-toggle ${
                      isCollapsed ? 'collapsed' : ''
                    }`}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <path
                        d="M3 2 L7 5 L3 8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                  <span className="group-icon">📁</span>
                  <span className="group-name" title={group.name}>
                    {group.name}
                  </span>
                  <span className="group-count">{group.resources.length}</span>
                  {onDeleteSourceGroup && (
                    <button
                      className="group-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSourceGroup(group.id);
                      }}
                      title="Remove all resources from this file"
                    >
                      ×
                    </button>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="resource-group-items">
                    {group.resources.map(({ resource, filteredIndex }) => {
                      const actualIdx = allResources.findIndex(
                        (r) => r === resource
                      );
                      const isActive = selectedIndex === actualIdx;
                      return (
                        <div
                          key={actualIdx}
                          className={`resource-item ${
                            isActive ? 'active' : ''
                          }`}
                          onClick={() => onSelectResource(filteredIndex)}
                        >
                          <div className="ri-icon">
                            {getResourceIcon(resource.type)}
                          </div>
                          <div className="ri-content">
                            <div className="ri-type">{resource.type}</div>
                            <div className="ri-id" title={resource.id}>
                              {resource.id}
                            </div>
                          </div>
                          <button
                            className="ri-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteResource(filteredIndex);
                            }}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

export default SidePanel;

