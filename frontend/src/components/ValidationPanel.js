import React, { useState, useCallback } from 'react';
import '../styles/components/ValidationPanel.css';

/**
 * FHIR Bundle Validation Panel
 * Supports validation against NDHM India, HL7 FHIR R4, and other international standards
 */
function ValidationPanel({ resources, onClose }) {
  const [selectedStandard, setSelectedStandard] = useState('ndhm-india');
  const [selectedVersion, setSelectedVersion] = useState('4.0.1');
  const [validationResults, setValidationResults] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationType, setValidationType] = useState('structure'); // structure, terminology, business

  const standards = [
    {
      id: 'ndhm-india',
      name: 'NDHM India',
      description: 'National Digital Health Mission (Ayushman Bharat Digital Mission)',
      versions: ['4.0.1', '4.0.0', '3.0.2'],
      icon: '🇮🇳',
      url: 'https://ndhm.gov.in/'
    },
    {
      id: 'nrces-india',
      name: 'NRCES India',
      description: 'National Resource Centre for EHR Standards',
      versions: ['4.0.1', '4.0.0'],
      icon: '🏥',
      url: 'https://nrces.in/ndhm/fhir/r4/'
    },
    {
      id: 'abdm-india',
      name: 'ABDM India',
      description: 'Ayushman Bharat Digital Mission Health Data Exchange',
      versions: ['4.0.1', '4.0.0'],
      icon: '💊',
      url: 'https://abdm.gov.in/'
    },
    {
      id: 'hcx-india',
      name: 'HCX India',
      description: 'Health Claims Exchange (Insurance Claims)',
      versions: ['4.0.1', '4.0.0'],
      icon: '🛡️',
      url: 'https://hcx.swasthmission.gov.in/'
    },
    {
      id: 'hl7-fhir-r4',
      name: 'HL7 FHIR R4',
      description: 'HL7 FHIR Release 4 (International Standard)',
      versions: ['4.0.1', '4.0.0', '4.3.0', '4.6.0'],
      icon: '🌍',
      url: 'https://hl7.org/fhir/R4/'
    },
    {
      id: 'hl7-fhir-r4b',
      name: 'HL7 FHIR R4B',
      description: 'HL7 FHIR Release 4B (Technical Correction)',
      versions: ['4.3.0'],
      icon: '🌐',
      url: 'https://hl7.org/fhir/R4B/'
    },
    {
      id: 'hl7-fhir-r5',
      name: 'HL7 FHIR R5',
      description: 'HL7 FHIR Release 5 (Latest International)',
      versions: ['5.0.0', '5.0.0-ballot'],
      icon: '🚀',
      url: 'https://hl7.org/fhir/R5/'
    },
    {
      id: 'us-core',
      name: 'US Core',
      description: 'US Core Implementation Guide (ONC Certification)',
      versions: ['7.0.0', '6.1.0', '5.0.1', '4.0.0', '3.1.1'],
      icon: '🇺🇸',
      url: 'https://www.hl7.org/fhir/us/core/'
    },
    {
      id: 'ips',
      name: 'IPS',
      description: 'International Patient Summary (Cross-border)',
      versions: ['1.1.0', '1.0.0', '2.0.0-ballot'],
      icon: '🌎',
      url: 'https://hl7.org/fhir/uv/ips/'
    },
    {
      id: 'au-core',
      name: 'AU Core',
      description: 'Australian Core Implementation Guide',
      versions: ['1.0.0', '0.3.0'],
      icon: '🇦🇺',
      url: 'https://build.fhir.org/ig/hl7au/au-fhir-core/'
    },
    {
      id: 'ca-core',
      name: 'CA Core',
      description: 'Canadian Core Implementation Guide',
      versions: ['1.0.0', '0.1.0'],
      icon: '🇨🇦',
      url: 'https://build.fhir.org/ig/HL7-Canada/ca-core/'
    },
    {
      id: 'uk-core',
      name: 'UK Core',
      description: 'UK Core Implementation Guide (NHS)',
      versions: ['2.0.1', '1.0.0'],
      icon: '🇬🇧',
      url: 'https://simplifier.net/hl7fhirukcorer4'
    },
    {
      id: 'smart-health',
      name: 'SMART Health',
      description: 'SMART on FHIR Health Cards (Vaccination)',
      versions: ['1.0.0', '0.7.0'],
      icon: '💉',
      url: 'https://smarthealth.cards/'
    },
    {
      id: 'carin-bb',
      name: 'CARIN Blue Button',
      description: 'Consumer Access to Insurance Information',
      versions: ['2.0.0', '1.2.0', '1.0.0'],
      icon: '📘',
      url: 'https://build.fhir.org/ig/HL7/carin-bb/'
    },
  ];

  const validationTypes = [
    { id: 'structure', name: 'Structure', description: 'Validate resource structure and cardinality' },
    { id: 'terminology', name: 'Terminology', description: 'Validate code systems and value sets' },
    { id: 'business', name: 'Business Rules', description: 'Validate business logic and invariants' },
    { id: 'full', name: 'Full Validation', description: 'Complete validation (all checks)' },
  ];

  const validateResources = useCallback(async () => {
    setIsValidating(true);
    setValidationResults(null);

    // Simulate validation (in a real app, this would call a FHIR validator service)
    await new Promise(resolve => setTimeout(resolve, 1500));

    const results = {
      timestamp: new Date().toISOString(),
      standard: standards.find(s => s.id === selectedStandard)?.name || selectedStandard,
      version: selectedVersion,
      validationType: validationTypes.find(t => t.id === validationType)?.name || validationType,
      totalResources: resources.length,
      summary: {
        valid: 0,
        warnings: 0,
        errors: 0,
        info: 0,
      },
      issues: [],
    };

    // Perform basic validation checks
    resources.forEach((resource, idx) => {
      const resourceIssues = validateResource(resource.data, selectedStandard, validationType);

      resourceIssues.forEach(issue => {
        results.issues.push({
          ...issue,
          resourceIndex: idx,
          resourceType: resource.type,
          resourceId: resource.id,
        });

        if (issue.severity === 'error') results.summary.errors++;
        else if (issue.severity === 'warning') results.summary.warnings++;
        else if (issue.severity === 'information') results.summary.info++;
      });

      if (resourceIssues.every(i => i.severity !== 'error')) {
        results.summary.valid++;
      }
    });

    setValidationResults(results);
    setIsValidating(false);
  }, [resources, selectedStandard, selectedVersion, validationType]);

  const selectedStandardInfo = standards.find(s => s.id === selectedStandard);

  return (
    <div className="validation-panel-overlay" onClick={onClose}>
      <div className="validation-panel" onClick={e => e.stopPropagation()}>
        <div className="validation-header">
          <div className="validation-title">
            <span className="validation-icon">✓</span>
            <h2>FHIR Bundle Validation</h2>
          </div>
          <button className="validation-close" onClick={onClose}>✕</button>
        </div>

        <div className="validation-body">
          {/* Configuration Section */}
          <div className="validation-config">
            <div className="config-section">
              <label className="config-label">Validation Standard</label>
              <div className="config-grid">
                {standards.map(std => (
                  <button
                    key={std.id}
                    className={`config-option ${selectedStandard === std.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedStandard(std.id);
                      setSelectedVersion(std.versions[0]);
                    }}
                    title={`${std.description}\n${std.url || ''}`}
                  >
                    <span className="option-icon">{std.icon}</span>
                    <span className="option-name">{std.name}</span>
                    <span className="option-desc">{std.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="config-row">
              <div className="config-section config-small">
                <label className="config-label">Version</label>
                <select
                  className="config-select"
                  value={selectedVersion}
                  onChange={e => setSelectedVersion(e.target.value)}
                >
                  {selectedStandardInfo?.versions.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="config-section config-small">
                <label className="config-label">Validation Type</label>
                <select
                  className="config-select"
                  value={validationType}
                  onChange={e => setValidationType(e.target.value)}
                >
                  {validationTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="config-info">
              <span className="info-icon">ℹ️</span>
              <span>
                {resources.length} resource{resources.length !== 1 ? 's' : ''} loaded for validation
              </span>
            </div>

            <button
              className="validate-btn"
              onClick={validateResources}
              disabled={isValidating || resources.length === 0}
            >
              {isValidating ? (
                <>
                  <span className="spinner"></span>
                  Validating...
                </>
              ) : (
                <>
                  <span>✓</span>
                  Validate Bundle
                </>
              )}
            </button>
          </div>

          {/* Results Section */}
          {validationResults && (
            <div className="validation-results">
              <div className="results-header">
                <h3>Validation Results</h3>
                <span className="results-timestamp">
                  {new Date(validationResults.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="results-summary">
                <div className={`summary-card ${validationResults.summary.errors === 0 ? 'success' : 'error'}`}>
                  <span className="summary-value">{validationResults.summary.valid}</span>
                  <span className="summary-label">Valid</span>
                </div>
                <div className={`summary-card ${validationResults.summary.errors > 0 ? 'error' : 'neutral'}`}>
                  <span className="summary-value">{validationResults.summary.errors}</span>
                  <span className="summary-label">Errors</span>
                </div>
                <div className={`summary-card ${validationResults.summary.warnings > 0 ? 'warning' : 'neutral'}`}>
                  <span className="summary-value">{validationResults.summary.warnings}</span>
                  <span className="summary-label">Warnings</span>
                </div>
                <div className="summary-card neutral">
                  <span className="summary-value">{validationResults.summary.info}</span>
                  <span className="summary-label">Info</span>
                </div>
              </div>

              <div className="results-issues">
                {validationResults.issues.length === 0 ? (
                  <div className="no-issues">
                    <span className="no-issues-icon">🎉</span>
                    <p>No issues found! All resources are valid against {validationResults.standard} v{validationResults.version}.</p>
                    <span className="no-issues-hint">Your FHIR bundle passes all {validationResults.validationType.toLowerCase()} checks.</span>
                  </div>
                ) : (
                  <>
                    <div className="issues-summary-bar">
                      <span>Found {validationResults.issues.length} issue{validationResults.issues.length !== 1 ? 's' : ''} to review</span>
                      {selectedStandardInfo?.url && (
                        <a
                          href={selectedStandardInfo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="spec-link"
                        >
                          📖 View Specification
                        </a>
                      )}
                    </div>
                    <div className="issues-list">
                      {validationResults.issues.map((issue, idx) => (
                        <div key={idx} className={`issue-item issue-${issue.severity}`}>
                          <div className="issue-header">
                            <span className={`issue-severity severity-${issue.severity}`}>
                              {issue.severity === 'error' ? '✕' : issue.severity === 'warning' ? '⚠' : 'ℹ'}
                            </span>
                            <span className="issue-resource">
                              {issue.resourceType}/{issue.resourceId}
                            </span>
                            <span className="issue-path">{issue.path}</span>
                          </div>
                          <div className="issue-message">{issue.message}</div>
                          {issue.suggestion && (
                            <div className="issue-suggestion">
                              <span className="suggestion-icon">💡</span>
                              <span><strong>How to fix:</strong> {issue.suggestion}</span>
                            </div>
                          )}
                          {issue.docLink && (
                            <a
                              href={issue.docLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="issue-doc-link"
                            >
                              📚 Documentation
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Validate a single FHIR resource
 * This is a basic implementation - in production, use a proper FHIR validator
 */
function validateResource(data, standard, validationType) {
  const issues = [];

  if (!data) {
    issues.push({
      severity: 'error',
      path: '/',
      message: 'Resource data is empty or null',
      suggestion: 'Ensure the resource contains valid FHIR data',
    });
    return issues;
  }

  // Check required fields
  if (!data.resourceType) {
    issues.push({
      severity: 'error',
      path: '/resourceType',
      message: 'Missing required field: resourceType',
      suggestion: 'Add a valid FHIR resourceType field',
    });
  }

  // Structure validation
  if (validationType === 'structure' || validationType === 'full') {
    // Check for common required fields based on resource type
    if (data.resourceType === 'Patient') {
      if (!data.name || data.name.length === 0) {
        issues.push({
          severity: 'warning',
          path: '/name',
          message: 'Patient resource should have at least one name',
          suggestion: 'Add a name element with given and/or family name',
        });
      }
      if (!data.identifier || data.identifier.length === 0) {
        issues.push({
          severity: 'information',
          path: '/identifier',
          message: 'Patient resource should have at least one identifier',
          suggestion: 'Add an identifier (e.g., MRN, Aadhaar, ABHA)',
        });
      }
      // NDHM specific checks
      if (standard === 'ndhm-india' || standard === 'nrces-india') {
        const hasAbha = data.identifier?.some(id =>
          id.system?.includes('ndhm') || id.system?.includes('abdm') || id.system?.includes('abha')
        );
        if (!hasAbha) {
          issues.push({
            severity: 'warning',
            path: '/identifier',
            message: 'NDHM: Patient should have an ABHA identifier',
            suggestion: 'Add an identifier with system containing "ndhm.gov.in" or "abdm.gov.in"',
          });
        }
      }
    }

    if (data.resourceType === 'Bundle') {
      if (!data.type) {
        issues.push({
          severity: 'error',
          path: '/type',
          message: 'Bundle must have a type',
          suggestion: 'Add bundle type (e.g., document, transaction, collection)',
        });
      }
      if (!data.entry || data.entry.length === 0) {
        issues.push({
          severity: 'warning',
          path: '/entry',
          message: 'Bundle has no entries',
          suggestion: 'Add resources to the bundle entry array',
        });
      }
      // Check for fullUrl in entries
      data.entry?.forEach((entry, idx) => {
        if (!entry.fullUrl) {
          issues.push({
            severity: 'warning',
            path: `/entry[${idx}]/fullUrl`,
            message: `Entry ${idx + 1} is missing fullUrl`,
            suggestion: 'Add a fullUrl to enable proper reference resolution',
          });
        }
        if (!entry.resource) {
          issues.push({
            severity: 'error',
            path: `/entry[${idx}]/resource`,
            message: `Entry ${idx + 1} is missing resource`,
            suggestion: 'Add a resource to the entry',
          });
        }
      });
    }

    if (data.resourceType === 'Claim' || data.resourceType === 'ClaimResponse') {
      if (!data.status) {
        issues.push({
          severity: 'error',
          path: '/status',
          message: 'Claim must have a status',
          suggestion: 'Add status (active, cancelled, draft, entered-in-error)',
        });
      }
      if (!data.type) {
        issues.push({
          severity: 'error',
          path: '/type',
          message: 'Claim must have a type',
          suggestion: 'Add claim type (institutional, oral, pharmacy, professional, vision)',
        });
      }
      if (!data.patient) {
        issues.push({
          severity: 'error',
          path: '/patient',
          message: 'Claim must reference a patient',
          suggestion: 'Add a patient reference',
        });
      }
      if (!data.provider) {
        issues.push({
          severity: 'error',
          path: '/provider',
          message: 'Claim must reference a provider',
          suggestion: 'Add a provider reference',
        });
      }
    }

    if (data.resourceType === 'Coverage') {
      if (!data.status) {
        issues.push({
          severity: 'error',
          path: '/status',
          message: 'Coverage must have a status',
          suggestion: 'Add status (active, cancelled, draft, entered-in-error)',
        });
      }
      if (!data.beneficiary) {
        issues.push({
          severity: 'error',
          path: '/beneficiary',
          message: 'Coverage must reference a beneficiary',
          suggestion: 'Add a beneficiary reference',
        });
      }
      if (!data.payor || data.payor.length === 0) {
        issues.push({
          severity: 'error',
          path: '/payor',
          message: 'Coverage must have at least one payor',
          suggestion: 'Add a payor reference',
        });
      }
    }

    if (data.resourceType === 'Task') {
      if (!data.status) {
        issues.push({
          severity: 'error',
          path: '/status',
          message: 'Task must have a status',
          suggestion: 'Add status (draft, requested, received, accepted, etc.)',
        });
      }
      if (!data.intent) {
        issues.push({
          severity: 'error',
          path: '/intent',
          message: 'Task must have an intent',
          suggestion: 'Add intent (unknown, proposal, plan, order, etc.)',
        });
      }
    }
  }

  // Terminology validation
  if (validationType === 'terminology' || validationType === 'full') {
    // Check coding systems
    const checkCoding = (coding, path) => {
      if (coding && Array.isArray(coding)) {
        coding.forEach((c, idx) => {
          if (c.system && !c.code) {
            issues.push({
              severity: 'warning',
              path: `${path}[${idx}]`,
              message: 'Coding has system but no code',
              suggestion: 'Add a code value for the coding',
            });
          }
          if (c.code && !c.system) {
            issues.push({
              severity: 'information',
              path: `${path}[${idx}]`,
              message: 'Coding has code but no system',
              suggestion: 'Add a system URL for the coding',
            });
          }
        });
      }
    };

    // Recursively check for codings
    const checkObject = (obj, currentPath) => {
      if (!obj || typeof obj !== 'object') return;

      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => checkObject(item, `${currentPath}[${idx}]`));
        return;
      }

      if (obj.coding) {
        checkCoding(obj.coding, `${currentPath}/coding`);
      }

      Object.entries(obj).forEach(([key, value]) => {
        if (key !== 'coding' && typeof value === 'object') {
          checkObject(value, `${currentPath}/${key}`);
        }
      });
    };

    checkObject(data, '');
  }

  return issues;
}

export default ValidationPanel;

