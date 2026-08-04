/**
 * importApi.js — Frontend API helpers for bulk import system
 */

import axios from 'axios';

// Use VITE_PORT — same env var used by the entire app for the backend URL
// VITE_API_URL is kept as secondary fallback for backward-compat
const _base = import.meta.env.VITE_PORT || import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API_BASE = _base.endsWith('/api/v1') ? _base : `${_base}/api/v1`;

const api = axios.create({
  baseURL: `${API_BASE}/import`,
  withCredentials: true,
});

/**
 * Preview import — parse file + show first rows + column mapping
 * @param {File} file - CSV or XLSX file
 * @param {string} entity - 'student' | 'teacher'
 */
export const previewImport = async (file, entity, sessionId) => {
  const form = new FormData();
  form.append('file', file);
  form.append('entity', entity);
  if (sessionId) form.append('sessionId', sessionId);
  const { data } = await api.post('/preview', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

/**
 * Start import — actual data insertion
 * @param {File} file
 * @param {object} options - { entity, duplicateMode, strictness, sessionId }
 */
export const startImport = async (file, options = {}) => {
  const form = new FormData();
  form.append('file', file);
  Object.entries(options).forEach(([k, v]) => { if (v) form.append(k, v); });
  const { data } = await api.post('/start', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

/**
 * Poll import status
 * @param {string} importLogId
 */
export const getImportStatus = async (importLogId) => {
  const { data } = await api.get(`/${importLogId}/status`);
  return data;
};

/**
 * Get paginated error list for an import
 */
export const getImportErrors = async (importLogId, page = 1, limit = 20) => {
  const { data } = await api.get(`/${importLogId}/errors`, { params: { page, limit } });
  return data;
};

/**
 * Get import history for an entity
 */
export const getImportHistory = async (entity, days = 30) => {
  const { data } = await api.get(`/history/${entity}`, { params: { days } });
  return data;
};

/**
 * Download error report as CSV (returns URL to open)
 */
export const getErrorReportUrl = (importLogId) =>
  `${API_BASE}/import/${importLogId}/error-report?format=csv`;
