import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useCreateReportTemplateMutation,
  useGetReportTemplateQuery,
  useUpdateReportTemplateMutation,
  useExtractTemplateFieldsMutation,
  usePreviewTemplateMutation,
  useValidateTemplateMutation,
} from '../../redux/api/reportTemplateApi';
import { useGetClassesQuery } from '../../redux/api/adminApi';
import './reportCard.css';

const SAMPLE_DATA = {
  name: 'Rahul Sharma',
  scholar_no: 'SCH0012024',
  roll_no: '1',
  class_name: '5A',
  section: 'A',
  father_name: 'Ramesh Sharma',
  mother_name: 'Sita Sharma',
  date_of_birth: '15/05/2014',
  gender: 'Male',
  category: 'General',
  subjects: [
    { name: 'English', theory: 85, project: 18, total: 103, grade: 'A+' },
    { name: 'Hindi', theory: 90, project: 19, total: 109, grade: 'A+' },
    { name: 'Maths', theory: 88, project: 19, total: 107, grade: 'A' },
    { name: 'Science', theory: 92, project: 20, total: 112, grade: 'A+' },
  ],
  grand_total: 754,
  total_percentage: 90.2,
  total_grade: 'A+',
  rank: 1,
  attendance: { totalDays: 120, presentDays: 115, percentage: 96 },
};

const TemplateEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    htmlContent: '',
    cssContent: '',
    templateType: 'annual',
    applicableExams: [],
    isDefault: false,
    config: {
      pageSize: 'A4',
      orientation: 'portrait',
      marginTop: 10,
      marginBottom: 10,
      marginLeft: 10,
      marginRight: 10,
    },
    // Class-group targeting
    classGroupName:    '',
    classRangeFrom:    null,
    classRangeTo:      null,
    applicableClassIds: [],
  });

  // Targeting mode UI state: 'all' | 'range' | 'specific'
  const [targetingMode, setTargetingMode] = useState('all');

  const [extractedFields, setExtractedFields] = useState([]);
  const [previewHtml, setPreviewHtml] = useState('');
  const [activeTab, setActiveTab] = useState('editor'); // editor, preview, fields
  const [validationResult, setValidationResult] = useState(null);

  // API hooks
  const { data: templateData, isLoading: isLoadingTemplate } = useGetReportTemplateQuery(id, {
    skip: !isEditMode,
  });
  // Fetch school's class list (sorted by numericOrder for range dropdowns)
  const { data: classesData } = useGetClassesQuery(undefined, { skip: false });
  const allClasses = (classesData?.classes || classesData?.data || [])
    .slice()
    .sort((a, b) => (a.numericOrder ?? 999) - (b.numericOrder ?? 999));

  const [createTemplate, { isLoading: isCreating }] = useCreateReportTemplateMutation();
  const [updateTemplate, { isLoading: isUpdating }] = useUpdateReportTemplateMutation();
  const [extractFields] = useExtractTemplateFieldsMutation();
  const [previewTemplate, { isLoading: isPreviewing }] = usePreviewTemplateMutation();
  const [validateTemplate] = useValidateTemplateMutation();

  // Load template data in edit mode
  useEffect(() => {
    if (isEditMode && templateData?.data) {
      const template = templateData.data;
      setFormData({
        name: template.name || '',
        description: template.description || '',
        htmlContent: template.htmlContent || '',
        cssContent: template.cssContent || '',
        templateType: template.templateType || 'annual',
        applicableExams: template.applicableExams || [],
        isDefault: template.isDefault || false,
        config: {
          ...formData.config,
          ...(template.config || {}),
        },
        // Class-group targeting
        classGroupName:    template.classGroupName || '',
        classRangeFrom:    template.classRangeFrom ?? null,
        classRangeTo:      template.classRangeTo   ?? null,
        applicableClassIds: template.applicableClassIds?.map(String) || [],
      });
      // Set targeting mode based on stored data
      if (template.applicableClassIds?.length > 0) setTargetingMode('specific');
      else if (template.classRangeFrom !== null && template.classRangeFrom !== undefined) setTargetingMode('range');
      else setTargetingMode('all');

      setExtractedFields(template.extractedFields || []);
    }
  }, [isEditMode, templateData]);

  // Auto-extract fields when HTML changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.htmlContent) {
        handleExtractFields();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [formData.htmlContent]);

  const handleExtractFields = async () => {
    if (!formData.htmlContent) return;

    try {
      const result = await extractFields(formData.htmlContent).unwrap();
      setExtractedFields(result.data?.fields || []);
    } catch (error) {
      console.error('Failed to extract fields:', error);
    }
  };

  const handlePreview = async () => {
    if (!formData.htmlContent) {
      toast.error('Please enter HTML content first');
      return;
    }

    try {
      const result = await previewTemplate({
        htmlContent: formData.htmlContent,
        cssContent: formData.cssContent,
        sampleData: SAMPLE_DATA,
      }).unwrap();

      setPreviewHtml(result);
      setActiveTab('preview');
    } catch (error) {
      toast.error('Failed to generate preview');
    }
  };

  const handleValidate = async () => {
    if (!formData.htmlContent) {
      toast.error('Please enter HTML content first');
      return;
    }

    try {
      const result = await validateTemplate({
        htmlContent: formData.htmlContent,
        sampleData: SAMPLE_DATA,
      }).unwrap();

      setValidationResult(result.data);
      setActiveTab('fields');

      if (result.data?.isValid) {
        toast.success('Template is valid!');
      } else {
        toast.warning(`Template has ${result.data?.validation?.missing?.length || 0} missing fields`);
      }
    } catch (error) {
      toast.error('Validation failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.htmlContent) {
      toast.error('Name and HTML content are required');
      return;
    }

    try {
      if (isEditMode) {
        await updateTemplate({ id, ...formData }).unwrap();
        toast.success('Template updated successfully');
      } else {
        await createTemplate(formData).unwrap();
        toast.success('Template created successfully');
      }
      navigate('/report-cards/templates');
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to save template');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleConfigChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value,
      },
    }));
  };

  // Auto-generate classGroupName label when range changes
  const handleRangeChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value !== '' ? Number(value) : null };
      // Auto-label: look up class names by numericOrder
      const fromClass = allClasses.find(c => c.numericOrder === next.classRangeFrom);
      const toClass   = allClasses.find(c => c.numericOrder === next.classRangeTo);
      if (fromClass && toClass) {
        const fromName = fromClass.className || fromClass.name || `Class ${next.classRangeFrom}`;
        const toName   = toClass.className   || toClass.name   || `Class ${next.classRangeTo}`;
        next.classGroupName = fromName === toName ? fromName : `${fromName}–${toName}`;
      }
      return next;
    });
  };

  // Toggle a class in applicableClassIds
  const handleClassCheckbox = (classId) => {
    setFormData(prev => {
      const ids = prev.applicableClassIds.map(String);
      const updated = ids.includes(String(classId))
        ? ids.filter(id => id !== String(classId))
        : [...ids, String(classId)];
      // Auto-label from selected class names
      const names = allClasses
        .filter(c => updated.includes(String(c._id)))
        .map(c => c.className || c.name)
        .join(', ');
      return { ...prev, applicableClassIds: updated, classGroupName: names || prev.classGroupName };
    });
  };

  // When switching targeting mode, clear old targeting data
  const handleModeChange = (mode) => {
    setTargetingMode(mode);
    setFormData(prev => ({
      ...prev,
      classRangeFrom:    null,
      classRangeTo:      null,
      applicableClassIds: [],
      classGroupName:    mode === 'all' ? '' : prev.classGroupName,
    }));
  };

  if (isEditMode && isLoadingTemplate) {
    return <div className="rc-loading">Loading template...</div>;
  }

  return (
    <div className="rc-container">
      <div className="rc-header">
        <h1 className="rc-title">{isEditMode ? 'Edit Template' : 'Create Template'}</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="rc-btn rc-btn-secondary"
            onClick={() => navigate('/report-cards/templates')}
          >
            Cancel
          </button>
          <button
            className="rc-btn rc-btn-primary"
            onClick={handleSubmit}
            disabled={isCreating || isUpdating}
          >
            {isCreating || isUpdating ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="rc-tabs" style={{ marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
        {['editor', 'preview', 'fields'].map((tab) => (
          <button
            key={tab}
            className={`rc-tab ${activeTab === tab ? 'rc-tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab ? '2px solid #3b82f6' : 'none',
              color: activeTab === tab ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Editor Tab */}
      {activeTab === 'editor' && (
        <form onSubmit={handleSubmit} className="rc-form">
          <div className="rc-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label className="rc-label">Template Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="rc-input"
                placeholder="e.g., Annual Report Card 2024"
                required
              />
            </div>
            <div>
              <label className="rc-label">Template Type</label>
              <select
                name="templateType"
                value={formData.templateType}
                onChange={handleChange}
                className="rc-select"
              >
                <option value="annual">Annual</option>
                <option value="half_yearly">Half Yearly</option>
                <option value="term1">Term 1</option>
                <option value="term2">Term 2</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label className="rc-label">Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="rc-input"
              placeholder="Brief description of this template"
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="rc-label">HTML Content *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="rc-btn rc-btn-sm rc-btn-secondary"
                  onClick={handlePreview}
                  disabled={isPreviewing}
                >
                  {isPreviewing ? 'Loading...' : 'Preview'}
                </button>
                <button
                  type="button"
                  className="rc-btn rc-btn-sm rc-btn-secondary"
                  onClick={handleValidate}
                >
                  Validate
                </button>
              </div>
            </div>
            <textarea
              name="htmlContent"
              value={formData.htmlContent}
              onChange={handleChange}
              className="rc-textarea"
              rows={15}
              placeholder={`Enter HTML template with placeholders:

Example:
<h1>{{name}}</h1>
<p>Scholar No: {{scholar_no}}</p>
<table>
  {{#subjects}}
  <tr>
    <td>{{name}}</td>
    <td>{{total}}</td>
  </tr>
  {{/subjects}}
</table>
<p>Grand Total: {{grand_total}}</p>`}
              required
              style={{ fontFamily: 'monospace', fontSize: '14px' }}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <label className="rc-label">CSS Styles</label>
            <textarea
              name="cssContent"
              value={formData.cssContent}
              onChange={handleChange}
              className="rc-textarea"
              rows={8}
              placeholder={`Enter custom CSS styles...

Example:
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #000; padding: 8px; }
h1 { text-align: center; }`}
              style={{ fontFamily: 'monospace', fontSize: '14px' }}
            />
          </div>

          {/* Page Settings */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Page Settings</h3>
            <div className="rc-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div>
                <label className="rc-label">Page Size</label>
                <select
                  value={formData.config.pageSize}
                  onChange={(e) => handleConfigChange('pageSize', e.target.value)}
                  className="rc-select"
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="Letter">Letter</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>
              <div>
                <label className="rc-label">Orientation</label>
                <select
                  value={formData.config.orientation}
                  onChange={(e) => handleConfigChange('orientation', e.target.value)}
                  className="rc-select"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <div>
                <label className="rc-label">Margin Top (mm)</label>
                <input
                  type="number"
                  value={formData.config.marginTop}
                  onChange={(e) => handleConfigChange('marginTop', parseInt(e.target.value))}
                  className="rc-input"
                  min={0}
                  max={50}
                />
              </div>
              <div>
                <label className="rc-label">Margin Bottom (mm)</label>
                <input
                  type="number"
                  value={formData.config.marginBottom}
                  onChange={(e) => handleConfigChange('marginBottom', parseInt(e.target.value))}
                  className="rc-input"
                  min={0}
                  max={50}
                />
              </div>
            </div>
          </div>

          {/* Class Group Targeting */}
          <div style={{ marginTop: '24px', padding: '20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎯</span> Class Group Targeting
              <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b', marginLeft: '4px' }}>
                — Which classes should use this template?
              </span>
            </h3>

            {/* Mode Selector */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[
                { key: 'all',      icon: '🌐', label: 'All Classes (Global Fallback)' },
                { key: 'range',    icon: '📚', label: 'Class Range' },
                { key: 'specific', icon: '🏫', label: 'Specific Classes' },
              ].map(({ key, icon, label }) => (
                <label key={key} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 16px', borderRadius: '8px', cursor: 'pointer',
                  background: targetingMode === key ? '#dbeafe' : '#fff',
                  border: `2px solid ${targetingMode === key ? '#3b82f6' : '#e2e8f0'}`,
                  fontWeight: targetingMode === key ? 600 : 400,
                  color: targetingMode === key ? '#1d4ed8' : '#374151',
                  transition: 'all 0.15s',
                }}>
                  <input
                    type="radio"
                    name="targetingMode"
                    checked={targetingMode === key}
                    onChange={() => handleModeChange(key)}
                    style={{ accentColor: '#3b82f6' }}
                  />
                  {icon} {label}
                </label>
              ))}
            </div>

            {/* Range Mode */}
            {targetingMode === 'range' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'end' }}>
                <div>
                  <label className="rc-label">From Class</label>
                  <select
                    className="rc-select"
                    value={formData.classRangeFrom ?? ''}
                    onChange={e => handleRangeChange('classRangeFrom', e.target.value)}
                  >
                    <option value="">-- Select From --</option>
                    {allClasses.map(c => (
                      <option key={c._id} value={c.numericOrder}>
                        {c.className || c.name} (Order: {c.numericOrder})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="rc-label">To Class</label>
                  <select
                    className="rc-select"
                    value={formData.classRangeTo ?? ''}
                    onChange={e => handleRangeChange('classRangeTo', e.target.value)}
                    disabled={formData.classRangeFrom === null}
                  >
                    <option value="">-- Select To --</option>
                    {allClasses
                      .filter(c => c.numericOrder >= (formData.classRangeFrom ?? 0))
                      .map(c => (
                        <option key={c._id} value={c.numericOrder}>
                          {c.className || c.name} (Order: {c.numericOrder})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="rc-label">Group Label (auto-filled)</label>
                  <input
                    type="text"
                    className="rc-input"
                    name="classGroupName"
                    value={formData.classGroupName}
                    onChange={handleChange}
                    placeholder="e.g. Primary Classes 1–5"
                  />
                </div>
              </div>
            )}

            {/* Specific Classes Mode */}
            {targetingMode === 'specific' && (
              <div>
                <label className="rc-label" style={{ marginBottom: '12px', display: 'block' }}>
                  Select Classes for this Template:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {allClasses.map(c => {
                    const checked = formData.applicableClassIds.includes(String(c._id));
                    return (
                      <label key={c._id} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
                        background: checked ? '#dbeafe' : '#fff',
                        border: `2px solid ${checked ? '#3b82f6' : '#e2e8f0'}`,
                        fontWeight: checked ? 600 : 400,
                        color: checked ? '#1d4ed8' : '#374151',
                        fontSize: '14px',
                        transition: 'all 0.15s',
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleClassCheckbox(String(c._id))}
                          style={{ accentColor: '#3b82f6' }}
                        />
                        {c.className || c.name}
                      </label>
                    );
                  })}
                  {allClasses.length === 0 && (
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>No classes found for your school.</p>
                  )}
                </div>
                {formData.applicableClassIds.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <label className="rc-label">Group Label (auto-filled)</label>
                    <input
                      type="text"
                      className="rc-input"
                      name="classGroupName"
                      value={formData.classGroupName}
                      onChange={handleChange}
                      placeholder="e.g. Class 9 & 10"
                      style={{ maxWidth: '320px' }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Summary Badge */}
            {targetingMode !== 'all' && (
              <div style={{ marginTop: '14px', padding: '10px 14px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: '13px' }}>
                <strong>Targeting:</strong>{' '}
                {targetingMode === 'range' && formData.classRangeFrom !== null && formData.classRangeTo !== null
                  ? `📚 Class range ${formData.classRangeFrom}–${formData.classRangeTo} → ${formData.classGroupName || 'unlabeled group'}`
                  : targetingMode === 'specific' && formData.applicableClassIds.length > 0
                  ? `🏫 ${formData.applicableClassIds.length} specific class(es) → ${formData.classGroupName || 'unlabeled group'}`
                  : 'Select class targeting above.'}
              </div>
            )}
          </div>

          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              name="isDefault"
              checked={formData.isDefault}
              onChange={handleChange}
              id="isDefault"
            />
            <label htmlFor="isDefault">Set as default template for this type &amp; class group</label>
          </div>
        </form>
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <div className="rc-preview-container">
          {previewHtml ? (
            <iframe
              srcDoc={previewHtml}
              style={{ width: '100%', height: '800px', border: '1px solid #e5e7eb' }}
              title="Template Preview"
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
              <p>Click "Preview" in the Editor tab to see the rendered template</p>
            </div>
          )}
        </div>
      )}

      {/* Fields Tab */}
      {activeTab === 'fields' && (
        <div className="rc-fields-container">
          <h3 style={{ marginBottom: '16px' }}>Extracted Fields ({extractedFields.length})</h3>
          
          {validationResult && (
            <div style={{ marginBottom: '20px', padding: '16px', background: validationResult.isValid ? '#dcfce7' : '#fef3c7', borderRadius: '8px' }}>
              <p style={{ margin: 0 }}>
                <strong>Validation Status:</strong> {validationResult.isValid ? 'Valid' : 'Issues Found'}
              </p>
              {validationResult.validation?.missing?.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <strong>Missing Fields:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    {validationResult.validation.missing.map((field, index) => (
                      <li key={index} style={{ color: '#92400e' }}>
                        {field.name || field}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {extractedFields.length === 0 ? (
            <p>No fields extracted yet. Enter HTML content to see extracted fields.</p>
          ) : (
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Field Name</th>
                  <th>Type</th>
                  <th>Parent Array</th>
                  <th>Full Match</th>
                </tr>
              </thead>
              <tbody>
                {extractedFields.map((field, index) => (
                  <tr key={index}>
                    <td><code>{field.name}</code></td>
                    <td>
                      <span className={`rc-badge rc-badge-${field.type}`}>
                        {field.type}
                      </span>
                    </td>
                    <td>{field.parentArray || '-'}</td>
                    <td><code>{field.fullMatch}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ marginTop: '24px' }}>
            <h4 style={{ marginBottom: '12px' }}>Available Data Fields</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '13px' }}>
              <div>
                <strong>Student Info:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>name, first_name, last_name</li>
                  <li>scholar_no, roll_no</li>
                  <li>class_name, section</li>
                  <li>date_of_birth, gender</li>
                  <li>father_name, mother_name</li>
                </ul>
              </div>
              <div>
                <strong>Marks (Arrays):</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>subjects[].name</li>
                  <li>subjects[].theory</li>
                  <li>subjects[].project</li>
                  <li>subjects[].total</li>
                  <li>subjects[].grade</li>
                </ul>
              </div>
              <div>
                <strong>Calculated:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>grand_total</li>
                  <li>total_percentage</li>
                  <li>total_grade</li>
                  <li>rank</li>
                  <li>attendance.percentage</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateEditor;
