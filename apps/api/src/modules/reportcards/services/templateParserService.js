/**
 * TemplateParserService  (v5 — Universal, safeResolve, FieldMapping integrated)
 *
 * Shared render engine used by BOTH the preview API and the PDF service.
 * This guarantees Preview === PDF (exact same HTML).
 *
 * Syntax supported:
 *   {{field}}                  Simple placeholder
 *   {{student-name}}           Hyphenated (via FieldMappingService)
 *   {{obj.field}}              Dot-notation
 *   {{obj.nested.field}}       Deep dot-notation
 *   {{subjects[2].t1_oral}}    Bracket-indexed array access
 *   {{subjects[2].obj.field}}  Combined bracket + dot
 *   {{#array}}...{{/array}}    Loop blocks
 *   {{@index}}                 Loop index (1-based)
 *
 * Resolution order (each step falls through to next):
 *   1. safeResolve(data, path)          — direct path
 *   2. safeResolve(data, mapped)        — field-mapped alias
 *   3. candidates from FieldMapping     — camel/snake/hyphen variants
 *   4. 'N/A'                            — safe fallback, never crashes
 */

const TemplateFieldExtractor = require('./templateFieldExtractor');
const FieldMappingService = require('../../admissions').fieldMappingService;
const logger = require('../../../core/logging/logger.js');

// Core resolvers

/**
 * deepResolve — handles dot-notation AND bracket notation inline.
 * Converts subjects[0].name → ['subjects','0','name'] before walking.
 *
 * Returns undefined (NOT 'N/A') so callers can decide on fallback.
 */
function deepResolve(obj, path) {
  if (!path || obj == null) return undefined;
  try {
    // Convert bracket notation: subjects[0].name → subjects.0.name
    const normalised = path.replace(/\[(\d+)\]/g, '.$1').replace(/^\./, '');
    return normalised.split('.').reduce((o, k) => {
      if (o == null) return undefined;
      return typeof o === 'object' ? o[k] : undefined;
    }, obj);
  } catch {
    return undefined;
  }
}

/**
 * normalizeKey — strips spaces, hyphens, underscores, lowercases.
 * Allows fuzzy field matching across different template naming conventions.
 *   "student-name" → "studentname"
 *   "Student_Name" → "studentname"
 *   "STUDENT NAME" → "studentname"
 */
function normalizeKey(k) {
  return (k || '').toLowerCase().replace(/[\s\-_]/g, '');
}

// safeResolve alias — kept for internal calls, returns undefined on miss
const safeResolve = deepResolve;

class TemplateParserService {
  // Public API

  /**
   * renderFinalHTML — SHARED engine for preview AND PDF.
   * Call this everywhere to guarantee Preview === PDF.
   *
   * @param {string} templateHtml  Raw template HTML
   * @param {Object} data          Aggregator snapshot data
   * @param {string} [css='']      Extra CSS to inject
   * @returns {{ html: string, missingFields: string[], success: boolean }}
   */
  static renderFinalHTML(templateHtml, data, css = '') {
    return this.render(templateHtml, data, { css });
  }

  static render(template, data = {}, options = {}) {
    const t0 = Date.now();
    const missingFields = [];

    if (!template || typeof template !== 'string') {
      return {
        html: '',
        missingFields: [],
        error: 'Invalid template',
        renderTime: 0,
        success: false,
      };
    }

    try {
      // Step 0: Enrich data with namespace objects + field aliases
      const enriched = this._normalizeData(data);

      // Pre-build a normalizedIndex for fuzzy key matching
      // normalizedIndex["studentname"] = enriched.name (for example)
      const normalizedIndex = {};
      Object.keys(enriched).forEach((k) => {
        normalizedIndex[normalizeKey(k)] = k; // maps normalized key → original key
      });
      enriched._normalizedIndex = normalizedIndex;

      let html = template;

      // Step 1: Bracket array access  {{subjects[2].t1_oral}}
      html = this._renderBracketAccess(html, enriched, missingFields);

      // Step 2: Loop blocks  {{#subjects}}...{{/subjects}}
      html = this._renderLoops(html, enriched, missingFields);

      // Step 3: Dot-notation  {{student.name}}
      html = this._renderObjectProperties(html, enriched, missingFields);

      // Step 4: Simple + hyphenated  {{name}} / {{student-name}}
      html = this._renderSimplePlaceholders(html, enriched, missingFields);

      // Step 5: Logo fallback — templates written before {{school-logo}} existed
      // still get the school logo at the top. Skipped when the template places
      // the logo itself, and when the school has no logo uploaded.
      html = this._prependLogoIfAbsent(html, template, enriched);

      const uniqueMissing = [...new Set(missingFields)];
      // warn, not debug: an unresolved placeholder renders as blank or 'N/A' and
      // is indistinguishable from genuinely absent marks unless the key is logged
      if (uniqueMissing.length > 0) {
        // Provide nearest-available key suggestions to aid template debugging
        const suggestions = {};
        const normalizedMap = enriched._normalizedIndex || {};
        uniqueMissing.forEach((mk) => {
          const nm = normalizeKey(mk);
          const candidates = Object.keys(normalizedMap)
            .filter((k) => {
              return k.includes(nm) || nm.includes(k) || k.startsWith(nm) || nm.startsWith(k);
            })
            .slice(0, 10)
            .map((k) => normalizedMap[k]);
          suggestions[mk] = candidates;
        });
        logger.warn('[TemplateParser] Unresolved placeholders', {
          keys: uniqueMissing,
          suggestions,
          availableKeys: Object.keys(enriched).filter((k) => !k.startsWith('_')).length,
        });
      }
      return {
        html,
        missingFields: uniqueMissing,
        renderTime: Date.now() - t0,
        success: true,
        debug: {
          dataKeyCount: Object.keys(enriched).filter((k) => !k.startsWith('_')).length,
          templateFieldCount: (template.match(/\{\{[^}]+\}\}/g) || []).length,
          missingCount: uniqueMissing.length,
        },
      };
    } catch (err) {
      logger.error('[TemplateParser] Render error:', err.message);
      return {
        html: template,
        missingFields: [],
        error: err.message,
        renderTime: Date.now() - t0,
        success: false,
      };
    }
  }

  static preview(template, data = {}, options = {}) {
    const result = this.render(template, data, options);
    if (!result.success) {
      return this._wrapInDocument(
        `<div style="color:red;padding:20px"><h3>Render Error</h3><p>${result.error}</p></div>`,
        options.css || ''
      );
    }
    const missingHtml =
      result.missingFields.length > 0
        ? `<div style="background:#fff3cd;border:1px solid #ffc107;padding:10px;margin-bottom:10px;font-size:11px;word-break:break-all;">
           <strong>⚠ Missing Fields (${result.missingFields.length}):</strong> ${result.missingFields.join(', ')}
         </div>`
        : '';
    return this._wrapInDocument(missingHtml + result.html, options.css || '');
  }

  static validate(template, data) {
    const extracted = TemplateFieldExtractor.extractFields(template);
    const validation = TemplateFieldExtractor.validateData(template, data);
    const renderResult = this.render(template, data);
    return {
      extracted,
      validation,
      renderResult: {
        success: renderResult.success,
        missingFields: renderResult.missingFields,
        renderTime: renderResult.renderTime,
      },
      isValid: validation.isValid && renderResult.success,
    };
  }

  // Step 0: Data normalisation

  /**
   * Build the <img> markup for the school logo.
   * Returns '' when the school has no logo so {{school-logo}} collapses to
   * nothing instead of emitting <img src=""> (which renders a broken icon).
   */
  static _logoImg(
    url,
    cls = 'rc-school-logo',
    style = 'max-height:90px;max-width:200px;object-fit:contain;'
  ) {
    if (!url || typeof url !== 'string') return '';
    const safe = url.replace(/"/g, '&quot;');
    return `<img class="${cls}" src="${safe}" alt="" style="${style}" />`;
  }

  static _normalizeData(raw) {
    // Apply all field-mapping aliases first
    let d = FieldMappingService.applyAliases({ ...raw });

    // school.* namespace
    // {{school-logo}} resolves to a ready-to-render <img> tag (empty when the
    // school has no logo); {{school-logo-url}} exposes the bare URL for
    // templates that need it inside their own markup.
    d.schoolLogo = d.school_logo = this._logoImg(d.schoolLogoUrl);
    // {{board-logo}} / {{student-photo}} follow the same contract as
    // {{school-logo}}: a ready-to-render <img>, or nothing at all when the
    // source URL is absent — never <img src="">.
    d.boardLogo = d.board_logo = this._logoImg(
      d.boardLogoUrl,
      'rc-board-logo',
      'max-height:80px;max-width:80px;object-fit:contain;'
    );
    d.studentPhoto = d.student_photo = this._logoImg(
      d.studentPhotoUrl,
      'rc-student-photo',
      'width:100%;height:100%;object-fit:cover;'
    );
    d.school = {
      name: d.schoolName || '',
      shortName: d.schoolShortName || '',
      code: d.schoolCode || '',
      tagline: d.schoolTagline || '',
      address: d.schoolAddress || '',
      phone: d.schoolPhone || '',
      email: d.schoolEmail || '',
      website: d.schoolWebsite || '',
      affiliatedTo: d.affiliatedTo || '',
      udiseCode: d.udiseCode || '',
      logo: d.schoolLogo || '',
      logoUrl: d.schoolLogoUrl || '',
      watermarkUrl: d.schoolWatermarkUrl || '',
      signatureUrl: d.schoolSignatureUrl || '',
      qrCodeUrl: d.schoolQrCodeUrl || '',
    };

    // student.* namespace
    // Merge existing student namespace (from AdmissionDataService) with parser defaults.
    // Do NOT overwrite keys already set to non-'N/A' values.
    const existingStudent = raw.student && typeof raw.student === 'object' ? raw.student : {};
    d.student = {
      name: d.name || 'N/A',
      firstName: d.firstName || 'N/A',
      lastName: d.lastName || 'N/A',
      rollNo: d.rollNo || d.roll_no || 'N/A',
      roll_no: d.rollNo || d.roll_no || 'N/A',
      scholarNo: d.scholarNo || d.scholar_no || 'N/A',
      scholar_no: d.scholarNo || d.scholar_no || 'N/A',
      admissionNo: d.admissionNo || d.admissionNumber || 'N/A',
      pen: d.pen || 'N/A',
      dob: d.dob || d.dateOfBirth || 'N/A',
      gender: d.gender || 'N/A',
      category: d.category || 'N/A',
      bloodGroup: d.bloodGroup || d.blood_group || 'N/A',
      religion: d.religion || 'N/A',
      caste: d.caste || 'N/A',
      nationality: d.nationality || 'N/A',
      fatherName: d.fatherName || d.father_name || 'N/A',
      motherName: d.motherName || d.mother_name || 'N/A',
      fatherOccupation: d.fatherOccupation || 'N/A',
      motherOccupation: d.motherOccupation || 'N/A',
      fatherPhone: d.fatherPhone || 'N/A',
      // address: keep as string, not object
      address: typeof d.address === 'string' ? d.address : d.fullAddress || 'N/A',
      phone: d.phone || 'N/A',
      email: d.email || 'N/A',
      // Merge any extra keys from AdmissionDataService student namespace
      ...existingStudent,
    };

    // academic.* namespace
    d.academic = {
      session: d.session || d.academicYear || 'N/A',
      year: d.academicYear || d.session || 'N/A',
      class: d.className || d.class || 'N/A',
      section: d.sectionName || d.section || 'N/A',
      year_start: d.year_start || 'N/A',
      year_end: d.year_end || 'N/A',
    };

    // summary.* namespace
    d.summary = {
      totalMarks: d.grandTotal || d.total_marks || 0,
      maxMarks: d.grandMaxTotal || 0,
      percentage: d.percentage || 0,
      grade: d.grade || 'N/A',
      rank: d.rank || 'N/A',
      result: d.result || 'N/A',
      promotedTo: d.promotedTo || d.promoted_to || 'N/A',
      attendance: d.attendance_str || d.attendance || 'N/A',
    };

    // attendance.* namespace
    d.attendance = {
      total: d.attendance_total || d.total_days || 0,
      present: d.attendance_present || d.present_days || 0,
      absent: d.attendance_absent || d.absent_days || 0,
      late: d.attendance_late || d.late_days || 0,
      leave: d.attendance_leave || d.leave_days || 0,
      percentage: d.attendance_percentage || 0,
      str: d.attendance_str || d.attendance || 'N/A',
    };

    // Enrich subject rows
    if (Array.isArray(d.subjects)) {
      d.subjects = d.subjects.map((sub) => this._enrichSubjectRow(sub));
    }

    // co_scholastic + skills
    // CRITICAL: never spread raw objects here — MongoDB internals (_id, reportCardId,
    // schoolId, createdAt…) would bleed into every loop-item context and resolve
    // template tokens incorrectly (e.g. all "Overall Total" rows showing grade "A").
    // Only pick the fields that templates actually need.
    const _pickCoItem = (c) => ({
      activity: c.activity || c.name || c.skillName || '',
      name: c.name || c.skillName || c.activity || '',
      skillName: c.skillName || c.name || c.activity || '',
      grade: c.grade || '',
      t1_grade: c.t1_grade || c.t1 || '',
      t2_grade: c.t2_grade || c.t2 || '',
      t1: c.t1 || c.t1_grade || '',
      t2: c.t2 || c.t2_grade || '',
      term1: c.term1 ?? '',
      term2: c.term2 ?? '',
      index: c.index || 0,
    });

    if (!d.co_scholastic && Array.isArray(d.skills)) {
      d.co_scholastic = d.skills.map(_pickCoItem);
    } else if (Array.isArray(d.co_scholastic)) {
      d.co_scholastic = d.co_scholastic.map(_pickCoItem);
    }
    // Keep coScholastic alias in sync
    d.coScholastic = d.co_scholastic || [];

    // misc extra aliases
    d.promotedTo = d.promotedTo || d.summary.promotedTo || 'N/A';
    d.promoted_to = d.promotedTo;
    d.result = d.result || d.summary.result || 'N/A';
    d.result_status = d.result_status || d.result;

    // Ensure address is always a clean formatted string, never an object.
    // AdmissionDataService puts address as a string; this guard handles edge cases.
    if (d.address && typeof d.address === 'object') {
      const a = d.address;
      d.address = a.full || [a.street, a.city, a.state, a.pincode].filter(Boolean).join(', ') || '';
    }

    // Preserve addr namespace from AdmissionDataService (dot-notation access)
    if (!d.addr && d.address && typeof d.address === 'string') {
      // Build a basic addr object from flat fields
      d.addr = {
        street: d.address || '',
        city: d.city || '',
        state: d.state || '',
        pincode: d.pincode || '',
        full: d.fullAddress || d.address || '',
      };
    }

    return d;
  }

  static _enrichSubjectRow(sub) {
    const s = { ...sub };
    const t1 = sub.term1 || {};
    const t2 = sub.term2 || {};

    // Collect ALL unique component types (fully dynamic — no hardcoded list)
    const allTypes = [
      ...new Set([
        ...Object.keys(t1).filter((k) => !['total', 'max'].includes(k)),
        ...Object.keys(t2).filter((k) => !['total', 'max'].includes(k)),
        ...Object.keys(sub.maxMarks || {}).filter((k) => k !== 'total'),
      ]),
    ];

    // Emit t1_<type> / t2_<type> for EVERY discovered component
    allTypes.forEach((type) => {
      s[`t1_${type}`] = t1[type] ?? null;
      s[`t2_${type}`] = t2[type] ?? null;
    });

    // Flat marks — obt_<component> / max_<component> for every component
    allTypes.forEach((type) => {
      if (s[`obt_${type}`] === undefined) {
        s[`obt_${type}`] = sub[`obt_${type}`] ?? t1[type] ?? t2[type] ?? null;
      }
      if (s[`max_${type}`] === undefined) {
        s[`max_${type}`] = sub[`max_${type}`] ?? sub.maxMarks?.[type] ?? 0;
      }
    });

    // Term totals — 'total' is excluded from allTypes above (it isn't a marks
    // component), so expose it explicitly for {{t1_total}} / {{t2_total}}.
    s.t1_total = t1.total ?? null;
    s.t2_total = t2.total ?? null;

    s.total = sub.total ?? sub.grandObt ?? 0;
    s.grandObt = sub.grandObt ?? sub.total ?? 0;
    s.grandMax = sub.grandMax ?? (sub.maxMarks?.total || 0);
    s.grade = sub.grade || '';
    s.remark = sub.remark || '';

    // term_1 / term_2 spelling aliases
    s.term_1 = s.term1 = t1;
    s.term_2 = s.term2 = t2;

    // Debug aid: list what components are available for this subject
    s._components = allTypes;

    return s;
  }

  // Step 1: Bracket array access

  static _renderBracketAccess(html, data, missing) {
    return html.replace(/\{\{(\w+)\[(\d+)\](?:\.([^}]+))?\}\}/g, (m, arrName, idxStr, prop) => {
      const arr = data[arrName];
      if (!Array.isArray(arr)) {
        missing.push(`${arrName}[${idxStr}]`);
        return '';
      }
      const item = arr[parseInt(idxStr, 10)];
      if (item == null) {
        missing.push(`${arrName}[${idxStr}]`);
        return '';
      }
      if (!prop) return this._fmt(item);
      const val = safeResolve(item, prop) ?? safeResolve(item, FieldMappingService.resolve(prop));
      if (val == null) {
        missing.push(`${arrName}[${idxStr}].${prop}`);
        return '';
      }
      return this._fmt(val);
    });
  }

  // Step 2: Loops

  static _renderLoops(html, data, missing) {
    return html.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (m, arrName, inner) => {
      const arr = safeResolve(data, arrName);

      // No value at all — skip block (falsy conditional)
      if (arr == null || arr === false || arr === '') return '';

      // Proper array — iterate normally
      if (Array.isArray(arr)) {
        if (!arr.length) return '';
        return arr
          .map((item, i) => this._renderItem(inner, item, i, arrName, data, missing))
          .join('');
      }

      // Scalar (truthy string / number) — Handlebars semantics: render block ONCE.
      // The scalar value is accessible as {{arrName}} inside the block via parent context.
      // e.g. {{#discipline}}{{discipline}}{{/discipline}} works when discipline = 'A'
      return this._renderItem(inner, {}, 0, arrName, data, missing);
    });
  }

  static _renderItem(tpl, item, idx, arrName, parent, missing) {
    let out = tpl;
    out = out.replace(/\{\{@index\}\}/g, String(idx + 1));
    out = out.replace(/\{\{@first\}\}/g, idx === 0 ? 'true' : 'false');
    out = out.replace(/\{\{@last\}\}/g, idx === parent[arrName]?.length - 1 ? 'true' : 'false');

    // Nested loops inside loops (e.g. {{#components}} inside {{#subjects}})
    out = out.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (m, innerArr, innerTpl) => {
      const nestedArr = safeResolve(item, innerArr) ?? safeResolve(parent, innerArr);
      if (!Array.isArray(nestedArr) || !nestedArr.length) return '';
      return nestedArr
        .map((ni, ni_idx) =>
          this._renderItem(innerTpl, ni, ni_idx, innerArr, { [innerArr]: nestedArr }, missing)
        )
        .join('');
    });

    // Dot-notation inside loop
    out = out.replace(/\{\{(\w+)\.(\w+(?:\.\w+)*)\}\}/g, (m, obj, path) => {
      const v = safeResolve(item[obj], path) ?? safeResolve(parent[obj], path);
      if (v == null) {
        missing.push(`${arrName}[${idx}].${obj}.${path}`);
        return 'N/A';
      }
      return this._fmt(v);
    });

    // Simple fields — with fuzzy normalizeKey fallback
    out = out.replace(/\{\{(\w+(?:[-]\w+)*)\}\}/g, (m, field) => {
      if (field.startsWith('@')) return m;

      // 1. FieldMapping candidates
      const candidates = FieldMappingService.candidates(field);
      for (const c of candidates) {
        const v = deepResolve(item, c) ?? deepResolve(parent, c);
        if (v != null) return this._fmt(v);
      }

      // 2. Fuzzy normalizeKey fallback — handles t1_oral, t1_half_yearly etc.
      const normField = normalizeKey(field);
      // Check item keys
      const itemKey = Object.keys(item).find((k) => normalizeKey(k) === normField);
      if (itemKey !== undefined) {
        const v = item[itemKey];
        if (v != null) return this._fmt(v);
      }
      // Check parent keys
      const parentKey = Object.keys(parent).find((k) => normalizeKey(k) === normField);
      if (parentKey !== undefined) {
        const v = parent[parentKey];
        if (v != null) return this._fmt(v);
      }

      missing.push(`${arrName}[${idx}].${field}`);
      return 'N/A';
    });

    return out;
  }

  // Step 3: Dot-notation outside loops

  static _renderObjectProperties(html, data, missing) {
    return html.replace(/\{\{(\w+)\.(\w+(?:\.\w+)*)\}\}/g, (m, obj, path) => {
      const v = safeResolve(data[obj], path);
      if (v != null) return this._fmt(v);
      // Try mapped name
      const mapped = FieldMappingService.resolve(`${obj}.${path}`);
      const v2 = safeResolve(data, mapped);
      if (v2 != null) return this._fmt(v2);
      missing.push(`${obj}.${path}`);
      return 'N/A';
    });
  }

  // Step 4: Simple / hyphenated placeholders

  static _renderSimplePlaceholders(html, data, missing) {
    const normIdx = data._normalizedIndex || {};

    // Match {{word}}, {{word-word}} (hyphenated), {{word_word}} (underscored), {{word.word}} (dots)
    // UNIVERSAL: supports any field name pattern from template
    return html.replace(/\{\{([\w\-\.]+)\}\}/g, (m, field) => {
      if (field.startsWith('#') || field.startsWith('/') || field.startsWith('@')) return m;

      // 1. Try FieldMapping candidates (handles known aliases)
      const candidates = FieldMappingService.candidates(field);
      for (const c of candidates) {
        const v = deepResolve(data, c);
        if (v != null) return this._fmt(v);
      }

      // 2. Fuzzy normalizeKey fallback: strips dashes/underscores/spaces and lowercases
      //    Allows {{student-name}}, {{Student_Name}}, {{studentname}} to all resolve
      const normField = normalizeKey(field);
      const matchedKey = normIdx[normField];
      if (matchedKey) {
        const v = data[matchedKey];
        if (v != null) return this._fmt(v);
      }

      // 3. Not found — return empty string (NOT 'N/A') so blank cells look clean
      //    Template-driven fields that aren't filled yet should show blank, not N/A
      missing.push(field);
      return '';
    });
  }

  // Step 5: Logo fallback

  /**
   * Prepend the school logo when the template doesn't position it itself.
   * No-ops when the template references any school logo token, or when the
   * school has no logo — so nothing is injected into templates that opt out.
   */
  static _prependLogoIfAbsent(html, rawTemplate, data) {
    const logoImg = data.schoolLogo;
    if (!logoImg) return html;
    // Matches {{school-logo}}, {{school_logo}}, {{schoolLogo}}, {{school.logo}},
    // {{school-logo-url}}, {{schoolLogoUrl}} …
    if (/\{\{\s*school[-_.]?logo/i.test(rawTemplate)) return html;
    return `<div class="rc-logo-header" style="text-align:center;margin-bottom:8px;">${logoImg}</div>${html}`;
  }

  // Helpers

  static _fmt(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (v instanceof Date) return v.toLocaleDateString('en-IN');
    if (Array.isArray(v)) return v.join(', ') || '';
    if (typeof v === 'object') {
      // If object has a 'full' key (address-like), use it directly
      if (v.full && typeof v.full === 'string') return v.full;
      // If object has street/city/state, format as address
      if (v.street || v.city) {
        return [v.street, v.city, v.state, v.pincode].filter(Boolean).join(', ');
      }
      // Generic object fallback — use only scalar values
      const scalar = Object.entries(v)
        .filter(([, val]) => val != null && typeof val !== 'object')
        .map(([, val]) => String(val))
        .filter(Boolean);
      return scalar.join(', ') || '';
    }
    return String(v ?? '');
  }

  static _wrapInDocument(content, css = '') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=794, initial-scale=1.0">
  <title>Admission Form</title>

  <!-- BASE STYLES -->
  <style>
    *, *::before, *::after { box-sizing: border-box; }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.4;
      background: #d1d5db;
      color: #111;
      margin: 0;
      padding: 0;
    }

    /* Screen: centred card that mimics A4 */
    .report-container {
      width: 794px;
      min-height: 1123px;
      margin: 16px auto;
      background: #fff;
      padding: 20px 24px;
      box-shadow: 0 2px 20px rgba(0,0,0,.22);
    }
  </style>

  <!-- TEMPLATE CUSTOM CSS (may override base above) -->
  <style>
    ${css}
  </style>

  <!-- PRINT OVERRIDES — always last, always wins -->
  <style>
    @page {
      size: A4 portrait;
      margin: 3mm;
    }

    @media print {
      html, body {
        background: #fff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 210mm !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .report-container {
        width: 210mm !important;
        min-height: unset !important;
        margin: 0 !important;
        padding: 4mm !important;
        box-shadow: none !important;
        border: none !important;
        overflow: visible !important;
      }

      /* Prevent rows / cells splitting across pages */
      table  { page-break-inside: auto;  width: 100% !important; }
      thead  { display: table-header-group; }
      tr     { page-break-inside: avoid; page-break-after: auto; }
      td, th { page-break-inside: avoid; }
      img    { max-width: 100% !important; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    ${content}
  </div>
</body>
</html>`;
  }
}

// Export the safeResolve utility for use in other services
TemplateParserService.safeResolve = safeResolve;

module.exports = TemplateParserService;
