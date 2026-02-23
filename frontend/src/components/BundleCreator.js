import React, { useState, useCallback, useMemo } from 'react';
import '../styles/components/BundleCreator.css';

/**
 * FHIR Bundle/Resource Creator
 * Allows users to create FHIR resources with a guided UI
 */
function BundleCreator({ onClose, onValidate, onAddResource }) {
  const [resourceType, setResourceType] = useState('Patient');
  const [bundleType, setBundleType] = useState('collection');
  const [createMode, setCreateMode] = useState('resource'); // 'resource' or 'bundle'
  const [formData, setFormData] = useState({});
  const [entries, setEntries] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  // Resource type definitions with fields
  const resourceDefinitions = useMemo(() => ({
    Patient: {
      icon: '👤',
      description: 'Demographics and administrative information about a patient',
      mandatory: ['name'],
      fields: [
        { name: 'id', type: 'string', label: 'Resource ID', placeholder: 'patient-001' },
        { name: 'identifier', type: 'identifier-list', label: 'Identifiers', description: 'Patient identifiers (MRN, SSN, ABHA, etc.)' },
        { name: 'active', type: 'boolean', label: 'Active', default: true },
        { name: 'name', type: 'human-name-list', label: 'Name(s)', mandatory: true, description: 'Patient name(s)' },
        { name: 'telecom', type: 'contact-list', label: 'Contact Info', description: 'Phone, email, etc.' },
        { name: 'gender', type: 'select', label: 'Gender', options: ['male', 'female', 'other', 'unknown'] },
        { name: 'birthDate', type: 'date', label: 'Birth Date' },
        { name: 'deceasedBoolean', type: 'boolean', label: 'Deceased' },
        { name: 'address', type: 'address-list', label: 'Address(es)' },
        { name: 'maritalStatus', type: 'codeable-concept', label: 'Marital Status' },
        { name: 'multipleBirthBoolean', type: 'boolean', label: 'Multiple Birth' },
        { name: 'communication', type: 'communication-list', label: 'Communication Preferences' },
      ]
    },
    Claim: {
      icon: '💰',
      description: 'Healthcare claim for services rendered',
      mandatory: ['status', 'type', 'use', 'patient', 'provider', 'priority'],
      fields: [
        { name: 'id', type: 'string', label: 'Resource ID', placeholder: 'claim-001' },
        { name: 'identifier', type: 'identifier-list', label: 'Claim Identifiers' },
        { name: 'status', type: 'select', label: 'Status', mandatory: true, options: ['active', 'cancelled', 'draft', 'entered-in-error'], default: 'active' },
        { name: 'type', type: 'codeable-concept', label: 'Claim Type', mandatory: true, description: 'institutional | oral | pharmacy | professional | vision' },
        { name: 'subType', type: 'codeable-concept', label: 'Sub Type' },
        { name: 'use', type: 'select', label: 'Use', mandatory: true, options: ['claim', 'preauthorization', 'predetermination'], default: 'claim' },
        { name: 'patient', type: 'reference', label: 'Patient', mandatory: true, targetType: 'Patient' },
        { name: 'billablePeriod', type: 'period', label: 'Billable Period' },
        { name: 'created', type: 'datetime', label: 'Created Date', default: new Date().toISOString() },
        { name: 'provider', type: 'reference', label: 'Provider', mandatory: true, targetType: 'Practitioner|Organization' },
        { name: 'insurer', type: 'reference', label: 'Insurer', targetType: 'Organization' },
        { name: 'priority', type: 'codeable-concept', label: 'Priority', mandatory: true },
        { name: 'facility', type: 'reference', label: 'Facility', targetType: 'Location' },
        { name: 'careTeam', type: 'care-team-list', label: 'Care Team' },
        { name: 'supportingInfo', type: 'supporting-info-list', label: 'Supporting Information' },
        { name: 'diagnosis', type: 'diagnosis-list', label: 'Diagnoses' },
        { name: 'procedure', type: 'procedure-list', label: 'Procedures' },
        { name: 'insurance', type: 'insurance-list', label: 'Insurance' },
        { name: 'item', type: 'claim-item-list', label: 'Items', description: 'Line items for the claim' },
        { name: 'total', type: 'money', label: 'Total Amount' },
      ]
    },
    Coverage: {
      icon: '🛡️',
      description: 'Insurance coverage information',
      mandatory: ['status', 'beneficiary', 'payor'],
      fields: [
        { name: 'id', type: 'string', label: 'Resource ID', placeholder: 'coverage-001' },
        { name: 'identifier', type: 'identifier-list', label: 'Coverage Identifiers' },
        { name: 'status', type: 'select', label: 'Status', mandatory: true, options: ['active', 'cancelled', 'draft', 'entered-in-error'], default: 'active' },
        { name: 'type', type: 'codeable-concept', label: 'Coverage Type' },
        { name: 'policyHolder', type: 'reference', label: 'Policy Holder', targetType: 'Patient|RelatedPerson|Organization' },
        { name: 'subscriber', type: 'reference', label: 'Subscriber', targetType: 'Patient|RelatedPerson' },
        { name: 'subscriberId', type: 'string', label: 'Subscriber ID' },
        { name: 'beneficiary', type: 'reference', label: 'Beneficiary', mandatory: true, targetType: 'Patient' },
        { name: 'dependent', type: 'string', label: 'Dependent Number' },
        { name: 'relationship', type: 'codeable-concept', label: 'Relationship to Subscriber' },
        { name: 'period', type: 'period', label: 'Coverage Period' },
        { name: 'payor', type: 'reference-list', label: 'Payor(s)', mandatory: true, targetType: 'Patient|RelatedPerson|Organization' },
        { name: 'class', type: 'coverage-class-list', label: 'Coverage Classes' },
        { name: 'order', type: 'number', label: 'Order (Priority)' },
        { name: 'network', type: 'string', label: 'Network' },
        { name: 'costToBeneficiary', type: 'cost-list', label: 'Cost to Beneficiary' },
        { name: 'subrogation', type: 'boolean', label: 'Subrogation' },
        { name: 'contract', type: 'reference-list', label: 'Contract(s)', targetType: 'Contract' },
      ]
    },
    Observation: {
      icon: '📊',
      description: 'Measurements and simple assertions',
      mandatory: ['status', 'code'],
      fields: [
        { name: 'id', type: 'string', label: 'Resource ID', placeholder: 'obs-001' },
        { name: 'identifier', type: 'identifier-list', label: 'Identifiers' },
        { name: 'status', type: 'select', label: 'Status', mandatory: true, options: ['registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error', 'unknown'], default: 'final' },
        { name: 'category', type: 'codeable-concept-list', label: 'Category' },
        { name: 'code', type: 'codeable-concept', label: 'Code', mandatory: true, description: 'What was observed' },
        { name: 'subject', type: 'reference', label: 'Subject', targetType: 'Patient|Group|Device|Location' },
        { name: 'encounter', type: 'reference', label: 'Encounter', targetType: 'Encounter' },
        { name: 'effectiveDateTime', type: 'datetime', label: 'Effective Date/Time' },
        { name: 'issued', type: 'datetime', label: 'Issued Date' },
        { name: 'performer', type: 'reference-list', label: 'Performer(s)', targetType: 'Practitioner|Organization' },
        { name: 'valueQuantity', type: 'quantity', label: 'Value (Quantity)' },
        { name: 'valueString', type: 'string', label: 'Value (String)' },
        { name: 'valueCodeableConcept', type: 'codeable-concept', label: 'Value (Code)' },
        { name: 'interpretation', type: 'codeable-concept-list', label: 'Interpretation' },
        { name: 'note', type: 'annotation-list', label: 'Notes' },
        { name: 'bodySite', type: 'codeable-concept', label: 'Body Site' },
        { name: 'method', type: 'codeable-concept', label: 'Method' },
        { name: 'referenceRange', type: 'reference-range-list', label: 'Reference Range' },
      ]
    },
    Practitioner: {
      icon: '👨‍⚕️',
      description: 'Healthcare provider information',
      mandatory: [],
      fields: [
        { name: 'id', type: 'string', label: 'Resource ID', placeholder: 'practitioner-001' },
        { name: 'identifier', type: 'identifier-list', label: 'Identifiers', description: 'NPI, Medical License, etc.' },
        { name: 'active', type: 'boolean', label: 'Active', default: true },
        { name: 'name', type: 'human-name-list', label: 'Name(s)' },
        { name: 'telecom', type: 'contact-list', label: 'Contact Info' },
        { name: 'address', type: 'address-list', label: 'Address(es)' },
        { name: 'gender', type: 'select', label: 'Gender', options: ['male', 'female', 'other', 'unknown'] },
        { name: 'birthDate', type: 'date', label: 'Birth Date' },
        { name: 'qualification', type: 'qualification-list', label: 'Qualifications' },
        { name: 'communication', type: 'codeable-concept-list', label: 'Languages' },
      ]
    },
    Organization: {
      icon: '🏢',
      description: 'Organization information (hospital, clinic, insurance company)',
      mandatory: [],
      fields: [
        { name: 'id', type: 'string', label: 'Resource ID', placeholder: 'org-001' },
        { name: 'identifier', type: 'identifier-list', label: 'Identifiers' },
        { name: 'active', type: 'boolean', label: 'Active', default: true },
        { name: 'type', type: 'codeable-concept-list', label: 'Organization Type' },
        { name: 'name', type: 'string', label: 'Name' },
        { name: 'alias', type: 'string-list', label: 'Alias Names' },
        { name: 'telecom', type: 'contact-list', label: 'Contact Info' },
        { name: 'address', type: 'address-list', label: 'Address(es)' },
        { name: 'partOf', type: 'reference', label: 'Part Of', targetType: 'Organization' },
      ]
    },
    Condition: {
      icon: '🩺',
      description: 'Clinical condition, problem, diagnosis',
      mandatory: ['subject'],
      fields: [
        { name: 'id', type: 'string', label: 'Resource ID', placeholder: 'condition-001' },
        { name: 'identifier', type: 'identifier-list', label: 'Identifiers' },
        { name: 'clinicalStatus', type: 'codeable-concept', label: 'Clinical Status', description: 'active | recurrence | relapse | inactive | remission | resolved' },
        { name: 'verificationStatus', type: 'codeable-concept', label: 'Verification Status' },
        { name: 'category', type: 'codeable-concept-list', label: 'Category' },
        { name: 'severity', type: 'codeable-concept', label: 'Severity' },
        { name: 'code', type: 'codeable-concept', label: 'Condition Code', description: 'ICD-10, SNOMED CT code' },
        { name: 'bodySite', type: 'codeable-concept-list', label: 'Body Site' },
        { name: 'subject', type: 'reference', label: 'Subject', mandatory: true, targetType: 'Patient|Group' },
        { name: 'encounter', type: 'reference', label: 'Encounter', targetType: 'Encounter' },
        { name: 'onsetDateTime', type: 'datetime', label: 'Onset Date' },
        { name: 'abatementDateTime', type: 'datetime', label: 'Abatement Date' },
        { name: 'recordedDate', type: 'datetime', label: 'Recorded Date' },
        { name: 'recorder', type: 'reference', label: 'Recorder', targetType: 'Practitioner|Patient' },
        { name: 'asserter', type: 'reference', label: 'Asserter', targetType: 'Practitioner|Patient' },
        { name: 'note', type: 'annotation-list', label: 'Notes' },
      ]
    },
    Encounter: {
      icon: '🚪',
      description: 'Healthcare encounter / visit',
      mandatory: ['status', 'class'],
      fields: [
        { name: 'id', type: 'string', label: 'Resource ID', placeholder: 'encounter-001' },
        { name: 'identifier', type: 'identifier-list', label: 'Identifiers' },
        { name: 'status', type: 'select', label: 'Status', mandatory: true, options: ['planned', 'arrived', 'triaged', 'in-progress', 'onleave', 'finished', 'cancelled', 'entered-in-error', 'unknown'], default: 'finished' },
        { name: 'class', type: 'coding', label: 'Class', mandatory: true, description: 'inpatient | outpatient | ambulatory | emergency' },
        { name: 'type', type: 'codeable-concept-list', label: 'Encounter Type' },
        { name: 'serviceType', type: 'codeable-concept', label: 'Service Type' },
        { name: 'priority', type: 'codeable-concept', label: 'Priority' },
        { name: 'subject', type: 'reference', label: 'Subject', targetType: 'Patient|Group' },
        { name: 'participant', type: 'participant-list', label: 'Participants' },
        { name: 'period', type: 'period', label: 'Period' },
        { name: 'reasonCode', type: 'codeable-concept-list', label: 'Reason Codes' },
        { name: 'reasonReference', type: 'reference-list', label: 'Reason References', targetType: 'Condition|Procedure|Observation' },
        { name: 'diagnosis', type: 'encounter-diagnosis-list', label: 'Diagnoses' },
        { name: 'hospitalization', type: 'hospitalization', label: 'Hospitalization Details' },
        { name: 'location', type: 'location-list', label: 'Locations' },
        { name: 'serviceProvider', type: 'reference', label: 'Service Provider', targetType: 'Organization' },
      ]
    },
  }), []);

  const bundleTypes = [
    { value: 'collection', label: 'Collection', description: 'A set of resources collected into a single package' },
    { value: 'document', label: 'Document', description: 'A clinical document (requires Composition)' },
    { value: 'message', label: 'Message', description: 'A message (requires MessageHeader)' },
    { value: 'transaction', label: 'Transaction', description: 'A transaction bundle for batch operations' },
    { value: 'batch', label: 'Batch', description: 'Independent batch operations' },
    { value: 'searchset', label: 'Search Set', description: 'Results of a search' },
  ];

  const resourceTypes = Object.keys(resourceDefinitions);
  const currentDef = resourceDefinitions[resourceType];

  // Handle field value changes
  const handleFieldChange = useCallback((fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    // Clear validation error for this field
    setValidationErrors(prev => prev.filter(e => e.field !== fieldName));
  }, []);

  // Generate the FHIR resource from form data
  const generateResource = useCallback(() => {
    const resource = {
      resourceType: resourceType,
    };

    // Add all filled fields
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Handle special types
        if (Array.isArray(value) && value.length === 0) return;
        if (typeof value === 'object' && Object.keys(value).length === 0) return;
        resource[key] = value;
      }
    });

    return resource;
  }, [resourceType, formData]);

  // Generate bundle from entries
  const generateBundle = useCallback(() => {
    return {
      resourceType: 'Bundle',
      type: bundleType,
      timestamp: new Date().toISOString(),
      total: entries.length,
      entry: entries.map((resource, idx) => ({
        fullUrl: `urn:uuid:${resource.id || `resource-${idx}`}`,
        resource: resource
      }))
    };
  }, [bundleType, entries]);

  // Validate the current resource
  const validateResource = useCallback(() => {
    const errors = [];
    const def = resourceDefinitions[resourceType];

    def.mandatory.forEach(fieldName => {
      const field = def.fields.find(f => f.name === fieldName);
      const value = formData[fieldName];

      if (!value || (Array.isArray(value) && value.length === 0)) {
        errors.push({
          field: fieldName,
          message: `${field?.label || fieldName} is required`,
          severity: 'error'
        });
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  }, [resourceType, formData, resourceDefinitions]);

  // Add current resource to bundle
  const handleAddToBundle = useCallback(() => {
    if (validateResource()) {
      const resource = generateResource();
      setEntries(prev => [...prev, resource]);
      setFormData({});
      setValidationErrors([]);
    }
  }, [validateResource, generateResource]);

  // Download resource/bundle as JSON
  const handleDownload = useCallback(() => {
    const data = createMode === 'bundle' ? generateBundle() : generateResource();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = createMode === 'bundle'
      ? `fhir-bundle-${new Date().toISOString().slice(0, 10)}.json`
      : `${resourceType.toLowerCase()}-${formData.id || 'new'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [createMode, generateBundle, generateResource, resourceType, formData.id]);

  // Add to viewer
  const handleAddToViewer = useCallback(() => {
    if (createMode === 'bundle') {
      if (entries.length === 0) {
        setValidationErrors([{ field: 'bundle', message: 'Add at least one resource to the bundle', severity: 'error' }]);
        return;
      }
      const bundle = generateBundle();
      onAddResource(JSON.stringify(bundle));
    } else {
      if (validateResource()) {
        const resource = generateResource();
        onAddResource(JSON.stringify(resource));
      }
    }
    onClose();
  }, [createMode, entries, generateBundle, generateResource, validateResource, onAddResource, onClose]);

  // Remove entry from bundle
  const handleRemoveEntry = useCallback((index) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Render a form field based on type
  const renderField = (field) => {
    const value = formData[field.name];
    const hasError = validationErrors.some(e => e.field === field.name);
    const isMandatory = field.mandatory || currentDef.mandatory.includes(field.name);

    return (
      <div key={field.name} className={`form-field ${hasError ? 'has-error' : ''} ${isMandatory ? 'mandatory' : ''}`}>
        <label className="field-label">
          {field.label}
          {isMandatory && <span className="required-mark">*</span>}
        </label>
        {field.description && <p className="field-description">{field.description}</p>}

        {renderFieldInput(field, value, hasError)}

        {hasError && (
          <span className="field-error">
            {validationErrors.find(e => e.field === field.name)?.message}
          </span>
        )}
      </div>
    );
  };

  // Render the appropriate input for field type
  const renderFieldInput = (field, value, hasError) => {
    switch (field.type) {
      case 'string':
        return (
          <input
            type="text"
            className={`field-input ${hasError ? 'error' : ''}`}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder || ''}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className={`field-input ${hasError ? 'error' : ''}`}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value ? Number(e.target.value) : undefined)}
          />
        );

      case 'boolean':
        return (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
            />
            <span className="checkbox-text">Yes</span>
          </label>
        );

      case 'date':
        return (
          <input
            type="date"
            className={`field-input ${hasError ? 'error' : ''}`}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            className={`field-input ${hasError ? 'error' : ''}`}
            value={value ? value.slice(0, 16) : ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value ? new Date(e.target.value).toISOString() : undefined)}
          />
        );

      case 'select':
        return (
          <select
            className={`field-input ${hasError ? 'error' : ''}`}
            value={value || field.default || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          >
            <option value="">-- Select --</option>
            {field.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'reference':
        return (
          <div className="reference-input">
            <input
              type="text"
              className={`field-input ${hasError ? 'error' : ''}`}
              value={value?.reference || ''}
              onChange={(e) => handleFieldChange(field.name, { reference: e.target.value })}
              placeholder={`${field.targetType}/id`}
            />
            <span className="reference-hint">Format: {field.targetType}/id</span>
          </div>
        );

      case 'codeable-concept':
        return (
          <div className="codeable-input">
            <input
              type="text"
              className="field-input"
              value={value?.coding?.[0]?.code || ''}
              onChange={(e) => handleFieldChange(field.name, {
                coding: [{ ...value?.coding?.[0], code: e.target.value }],
                text: value?.text
              })}
              placeholder="Code"
            />
            <input
              type="text"
              className="field-input"
              value={value?.coding?.[0]?.display || ''}
              onChange={(e) => handleFieldChange(field.name, {
                coding: [{ ...value?.coding?.[0], display: e.target.value }],
                text: e.target.value || value?.text
              })}
              placeholder="Display"
            />
            <input
              type="text"
              className="field-input"
              value={value?.coding?.[0]?.system || ''}
              onChange={(e) => handleFieldChange(field.name, {
                coding: [{ ...value?.coding?.[0], system: e.target.value }],
                text: value?.text
              })}
              placeholder="System URL"
            />
          </div>
        );

      case 'quantity':
        return (
          <div className="quantity-input">
            <input
              type="number"
              className="field-input"
              value={value?.value || ''}
              onChange={(e) => handleFieldChange(field.name, {
                ...value,
                value: e.target.value ? Number(e.target.value) : undefined
              })}
              placeholder="Value"
            />
            <input
              type="text"
              className="field-input"
              value={value?.unit || ''}
              onChange={(e) => handleFieldChange(field.name, {
                ...value,
                unit: e.target.value,
                code: e.target.value
              })}
              placeholder="Unit"
            />
          </div>
        );

      case 'money':
        return (
          <div className="money-input">
            <input
              type="number"
              className="field-input"
              value={value?.value || ''}
              onChange={(e) => handleFieldChange(field.name, {
                ...value,
                value: e.target.value ? Number(e.target.value) : undefined
              })}
              placeholder="Amount"
              step="0.01"
            />
            <select
              className="field-input currency-select"
              value={value?.currency || 'INR'}
              onChange={(e) => handleFieldChange(field.name, {
                ...value,
                currency: e.target.value
              })}
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        );

      case 'period':
        return (
          <div className="period-input">
            <div className="period-field">
              <label>Start</label>
              <input
                type="datetime-local"
                className="field-input"
                value={value?.start ? value.start.slice(0, 16) : ''}
                onChange={(e) => handleFieldChange(field.name, {
                  ...value,
                  start: e.target.value ? new Date(e.target.value).toISOString() : undefined
                })}
              />
            </div>
            <div className="period-field">
              <label>End</label>
              <input
                type="datetime-local"
                className="field-input"
                value={value?.end ? value.end.slice(0, 16) : ''}
                onChange={(e) => handleFieldChange(field.name, {
                  ...value,
                  end: e.target.value ? new Date(e.target.value).toISOString() : undefined
                })}
              />
            </div>
          </div>
        );

      case 'identifier-list':
        return <IdentifierListInput value={value || []} onChange={(v) => handleFieldChange(field.name, v)} />;

      case 'human-name-list':
        return <HumanNameListInput value={value || []} onChange={(v) => handleFieldChange(field.name, v)} />;

      case 'contact-list':
        return <ContactListInput value={value || []} onChange={(v) => handleFieldChange(field.name, v)} />;

      case 'address-list':
        return <AddressListInput value={value || []} onChange={(v) => handleFieldChange(field.name, v)} />;

      case 'claim-item-list':
        return <ClaimItemListInput value={value || []} onChange={(v) => handleFieldChange(field.name, v)} />;

      default:
        return (
          <input
            type="text"
            className={`field-input ${hasError ? 'error' : ''}`}
            value={typeof value === 'object' ? JSON.stringify(value) : (value || '')}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleFieldChange(field.name, parsed);
              } catch {
                handleFieldChange(field.name, e.target.value);
              }
            }}
            placeholder={`Enter ${field.label}`}
          />
        );
    }
  };

  const previewData = createMode === 'bundle' ? generateBundle() : generateResource();

  return (
    <div className="bundle-creator-overlay" onClick={onClose}>
      <div className="bundle-creator" onClick={e => e.stopPropagation()}>
        <div className="creator-header">
          <div className="creator-title">
            <span className="creator-icon">🏗️</span>
            <h2>FHIR Resource Creator</h2>
          </div>
          <button className="creator-close" onClick={onClose}>✕</button>
        </div>

        <div className="creator-body">
          {/* Mode Selection */}
          <div className="mode-selector">
            <button
              className={`mode-btn ${createMode === 'resource' ? 'active' : ''}`}
              onClick={() => setCreateMode('resource')}
            >
              <span className="mode-icon">📄</span>
              <span className="mode-label">Single Resource</span>
            </button>
            <button
              className={`mode-btn ${createMode === 'bundle' ? 'active' : ''}`}
              onClick={() => setCreateMode('bundle')}
            >
              <span className="mode-icon">📦</span>
              <span className="mode-label">Bundle</span>
            </button>
          </div>

          {/* Bundle Type Selection */}
          {createMode === 'bundle' && (
            <div className="bundle-type-selector">
              <label className="field-label">Bundle Type</label>
              <div className="bundle-types">
                {bundleTypes.map(bt => (
                  <button
                    key={bt.value}
                    className={`bundle-type-btn ${bundleType === bt.value ? 'active' : ''}`}
                    onClick={() => setBundleType(bt.value)}
                    title={bt.description}
                  >
                    {bt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resource Type Selection */}
          <div className="resource-type-selector">
            <label className="field-label">Resource Type</label>
            <div className="resource-types">
              {resourceTypes.map(rt => (
                <button
                  key={rt}
                  className={`resource-type-btn ${resourceType === rt ? 'active' : ''}`}
                  onClick={() => {
                    setResourceType(rt);
                    setFormData({});
                    setValidationErrors([]);
                  }}
                  title={resourceDefinitions[rt].description}
                >
                  <span className="rt-icon">{resourceDefinitions[rt].icon}</span>
                  <span className="rt-name">{rt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="form-container">
            <div className="form-section">
              <h3 className="section-title">
                {currentDef.icon} {resourceType} Fields
                <span className="section-hint">Fields marked with * are mandatory</span>
              </h3>
              <p className="section-description">{currentDef.description}</p>

              <div className="fields-grid">
                {currentDef.fields.map(field => renderField(field))}
              </div>
            </div>

            {/* Bundle Entries */}
            {createMode === 'bundle' && (
              <div className="bundle-entries">
                <h3 className="section-title">
                  📦 Bundle Entries ({entries.length})
                  <button className="add-entry-btn" onClick={handleAddToBundle}>
                    + Add Current Resource
                  </button>
                </h3>

                {entries.length === 0 ? (
                  <p className="no-entries">No entries yet. Fill the form above and click "Add Current Resource"</p>
                ) : (
                  <div className="entries-list">
                    {entries.map((entry, idx) => (
                      <div key={idx} className="entry-item">
                        <span className="entry-icon">{resourceDefinitions[entry.resourceType]?.icon || '📄'}</span>
                        <span className="entry-type">{entry.resourceType}</span>
                        <span className="entry-id">{entry.id || `(no id)`}</span>
                        <button className="remove-entry-btn" onClick={() => handleRemoveEntry(idx)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview Toggle */}
          <div className="preview-section">
            <button
              className="preview-toggle"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? '▼ Hide Preview' : '▶ Show JSON Preview'}
            </button>

            {showPreview && (
              <pre className="json-preview">
                {JSON.stringify(previewData, null, 2)}
              </pre>
            )}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="validation-errors">
              <h4>⚠️ Validation Issues</h4>
              <ul>
                {validationErrors.map((err, idx) => (
                  <li key={idx} className={`error-${err.severity}`}>{err.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="creator-footer">
          <button className="action-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="action-btn secondary" onClick={handleDownload}>
            ⬇️ Download JSON
          </button>
          <button className="action-btn primary" onClick={handleAddToViewer}>
            ✓ Add to Viewer
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-components for complex field types

function IdentifierListInput({ value, onChange }) {
  const addIdentifier = () => {
    onChange([...value, { system: '', value: '', use: 'official' }]);
  };

  const updateIdentifier = (idx, field, val) => {
    const newList = [...value];
    newList[idx] = { ...newList[idx], [field]: val };
    onChange(newList);
  };

  const removeIdentifier = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="list-input">
      {value.map((id, idx) => (
        <div key={idx} className="list-item">
          <select
            className="field-input small"
            value={id.use || 'official'}
            onChange={(e) => updateIdentifier(idx, 'use', e.target.value)}
          >
            <option value="usual">Usual</option>
            <option value="official">Official</option>
            <option value="temp">Temporary</option>
            <option value="secondary">Secondary</option>
          </select>
          <input
            type="text"
            className="field-input"
            value={id.system || ''}
            onChange={(e) => updateIdentifier(idx, 'system', e.target.value)}
            placeholder="System URL"
          />
          <input
            type="text"
            className="field-input"
            value={id.value || ''}
            onChange={(e) => updateIdentifier(idx, 'value', e.target.value)}
            placeholder="Value"
          />
          <button className="remove-btn" onClick={() => removeIdentifier(idx)}>✕</button>
        </div>
      ))}
      <button className="add-btn" onClick={addIdentifier}>+ Add Identifier</button>
    </div>
  );
}

function HumanNameListInput({ value, onChange }) {
  const addName = () => {
    onChange([...value, { use: 'official', family: '', given: [''] }]);
  };

  const updateName = (idx, field, val) => {
    const newList = [...value];
    newList[idx] = { ...newList[idx], [field]: val };
    onChange(newList);
  };

  const removeName = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="list-input">
      {value.map((name, idx) => (
        <div key={idx} className="list-item name-item">
          <select
            className="field-input small"
            value={name.use || 'official'}
            onChange={(e) => updateName(idx, 'use', e.target.value)}
          >
            <option value="usual">Usual</option>
            <option value="official">Official</option>
            <option value="temp">Temporary</option>
            <option value="nickname">Nickname</option>
            <option value="maiden">Maiden</option>
          </select>
          <input
            type="text"
            className="field-input"
            value={name.prefix?.join(' ') || ''}
            onChange={(e) => updateName(idx, 'prefix', e.target.value ? e.target.value.split(' ') : [])}
            placeholder="Prefix (Dr., Mr.)"
          />
          <input
            type="text"
            className="field-input"
            value={name.given?.join(' ') || ''}
            onChange={(e) => updateName(idx, 'given', e.target.value ? e.target.value.split(' ') : [])}
            placeholder="Given name(s)"
          />
          <input
            type="text"
            className="field-input"
            value={name.family || ''}
            onChange={(e) => updateName(idx, 'family', e.target.value)}
            placeholder="Family name"
          />
          <button className="remove-btn" onClick={() => removeName(idx)}>✕</button>
        </div>
      ))}
      <button className="add-btn" onClick={addName}>+ Add Name</button>
    </div>
  );
}

function ContactListInput({ value, onChange }) {
  const addContact = () => {
    onChange([...value, { system: 'phone', value: '', use: 'home' }]);
  };

  const updateContact = (idx, field, val) => {
    const newList = [...value];
    newList[idx] = { ...newList[idx], [field]: val };
    onChange(newList);
  };

  const removeContact = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="list-input">
      {value.map((contact, idx) => (
        <div key={idx} className="list-item">
          <select
            className="field-input small"
            value={contact.system || 'phone'}
            onChange={(e) => updateContact(idx, 'system', e.target.value)}
          >
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="fax">Fax</option>
            <option value="url">URL</option>
          </select>
          <select
            className="field-input small"
            value={contact.use || 'home'}
            onChange={(e) => updateContact(idx, 'use', e.target.value)}
          >
            <option value="home">Home</option>
            <option value="work">Work</option>
            <option value="mobile">Mobile</option>
            <option value="temp">Temp</option>
          </select>
          <input
            type="text"
            className="field-input"
            value={contact.value || ''}
            onChange={(e) => updateContact(idx, 'value', e.target.value)}
            placeholder="Contact value"
          />
          <button className="remove-btn" onClick={() => removeContact(idx)}>✕</button>
        </div>
      ))}
      <button className="add-btn" onClick={addContact}>+ Add Contact</button>
    </div>
  );
}

function AddressListInput({ value, onChange }) {
  const addAddress = () => {
    onChange([...value, { use: 'home', type: 'physical', line: [''], city: '', state: '', postalCode: '', country: '' }]);
  };

  const updateAddress = (idx, field, val) => {
    const newList = [...value];
    newList[idx] = { ...newList[idx], [field]: val };
    onChange(newList);
  };

  const removeAddress = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="list-input">
      {value.map((addr, idx) => (
        <div key={idx} className="list-item address-item">
          <div className="address-row">
            <select
              className="field-input small"
              value={addr.use || 'home'}
              onChange={(e) => updateAddress(idx, 'use', e.target.value)}
            >
              <option value="home">Home</option>
              <option value="work">Work</option>
              <option value="temp">Temporary</option>
              <option value="billing">Billing</option>
            </select>
            <input
              type="text"
              className="field-input"
              value={addr.line?.join(', ') || ''}
              onChange={(e) => updateAddress(idx, 'line', e.target.value ? e.target.value.split(', ') : [])}
              placeholder="Street address"
            />
          </div>
          <div className="address-row">
            <input
              type="text"
              className="field-input"
              value={addr.city || ''}
              onChange={(e) => updateAddress(idx, 'city', e.target.value)}
              placeholder="City"
            />
            <input
              type="text"
              className="field-input"
              value={addr.state || ''}
              onChange={(e) => updateAddress(idx, 'state', e.target.value)}
              placeholder="State"
            />
            <input
              type="text"
              className="field-input"
              value={addr.postalCode || ''}
              onChange={(e) => updateAddress(idx, 'postalCode', e.target.value)}
              placeholder="Postal Code"
            />
            <input
              type="text"
              className="field-input"
              value={addr.country || ''}
              onChange={(e) => updateAddress(idx, 'country', e.target.value)}
              placeholder="Country"
            />
          </div>
          <button className="remove-btn" onClick={() => removeAddress(idx)}>✕</button>
        </div>
      ))}
      <button className="add-btn" onClick={addAddress}>+ Add Address</button>
    </div>
  );
}

function ClaimItemListInput({ value, onChange }) {
  const addItem = () => {
    onChange([...value, {
      sequence: value.length + 1,
      productOrService: { coding: [{ code: '', display: '' }] },
      quantity: { value: 1 },
      unitPrice: { value: 0, currency: 'INR' },
      net: { value: 0, currency: 'INR' }
    }]);
  };

  const updateItem = (idx, field, val) => {
    const newList = [...value];
    newList[idx] = { ...newList[idx], [field]: val };
    // Auto-calculate net
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = field === 'quantity' ? val.value : newList[idx].quantity?.value || 1;
      const price = field === 'unitPrice' ? val.value : newList[idx].unitPrice?.value || 0;
      newList[idx].net = { value: qty * price, currency: newList[idx].unitPrice?.currency || 'INR' };
    }
    onChange(newList);
  };

  const removeItem = (idx) => {
    const newList = value.filter((_, i) => i !== idx);
    // Re-sequence
    newList.forEach((item, i) => { item.sequence = i + 1; });
    onChange(newList);
  };

  return (
    <div className="list-input claim-items">
      {value.map((item, idx) => (
        <div key={idx} className="list-item claim-item">
          <div className="claim-item-header">
            <span className="item-sequence">#{item.sequence}</span>
            <button className="remove-btn" onClick={() => removeItem(idx)}>✕</button>
          </div>
          <div className="claim-item-row">
            <input
              type="text"
              className="field-input"
              value={item.productOrService?.coding?.[0]?.code || ''}
              onChange={(e) => updateItem(idx, 'productOrService', {
                coding: [{ ...item.productOrService?.coding?.[0], code: e.target.value }]
              })}
              placeholder="Service Code"
            />
            <input
              type="text"
              className="field-input"
              value={item.productOrService?.coding?.[0]?.display || ''}
              onChange={(e) => updateItem(idx, 'productOrService', {
                coding: [{ ...item.productOrService?.coding?.[0], display: e.target.value }],
                text: e.target.value
              })}
              placeholder="Service Description"
            />
          </div>
          <div className="claim-item-row">
            <div className="field-group">
              <label>Quantity</label>
              <input
                type="number"
                className="field-input small"
                value={item.quantity?.value || 1}
                onChange={(e) => updateItem(idx, 'quantity', { value: Number(e.target.value) })}
              />
            </div>
            <div className="field-group">
              <label>Unit Price</label>
              <input
                type="number"
                className="field-input"
                value={item.unitPrice?.value || 0}
                onChange={(e) => updateItem(idx, 'unitPrice', {
                  value: Number(e.target.value),
                  currency: item.unitPrice?.currency || 'INR'
                })}
                step="0.01"
              />
            </div>
            <div className="field-group">
              <label>Net</label>
              <input
                type="number"
                className="field-input"
                value={item.net?.value || 0}
                readOnly
              />
            </div>
          </div>
        </div>
      ))}
      <button className="add-btn" onClick={addItem}>+ Add Item</button>
    </div>
  );
}

export default BundleCreator;

