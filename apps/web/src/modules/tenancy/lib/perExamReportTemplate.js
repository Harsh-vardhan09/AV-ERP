/**
 * Per-exam report-card template.
 *
 * The other starter (starterReportTemplate.js) assumes CBSE's shape: several
 * COMPONENTS inside one exam (periodic test + notebook + enrichment + annual),
 * bound as t1_pertest / t1_nb / t1_se / t1_halfyearly.
 *
 * This one assumes the other common shape: each assessment is its own EXAM
 * document carrying a single aggregate mark per subject —
 *     FA1 Exam 1   15-17 Apr    English 10/10
 *     FA2 Exam 1   5-7 Jun      English 10/10
 *     SA-I         10-20 Sept   English 55/60
 * A school running that shape has no components at all, so component tokens have
 * nothing to bind to and every such column renders blank.
 *
 * The columns therefore cannot be hard-coded: they differ per school and per
 * class. They come from the examColumns array, which the aggregator builds in
 * exam-date order, and each subject's exams array is padded to match it exactly,
 * so header cell i and body cell i always describe the same exam even when a
 * subject skipped one.
 *
 * A4 SAFETY: past six exam columns the table stops fitting A4 portrait. The
 * aggregator decides this, not CSS — examColumnsFit is truthy only while the
 * wide layout fits, and examColumnsOverflow is truthy only when it does not.
 * Exactly one of the two blocks below renders. Neither is an inverted section:
 * the parser has no ^ support, so both are plain positive sections.
 */

export const PER_EXAM_TEMPLATE_HTML = `<!--
  ═══════════════════════════════════════════════════════════════════════
  PER-EXAM REPORT CARD TEMPLATE

  Names below are written WITHOUT braces on purpose — a comment is not exempt
  from placeholder scanning, so writing them in braces here would add phantom
  entries to the "Missing Fields" banner. Wrap each name in double braces where
  you actually use it, exactly as the markup further down does.

  SCHOOL BRANDING (resolved per school — never hard-code these)
    school-logo       the school's uploaded logo, as a ready-made <img> tag
    school-name       school name
    board-logo        board / affiliation logo, when uploaded

  STUDENT DETAILS
    student-name   rollNo   admissionNumber   dob
    father-name    mother-name   class   session   student-photo

  EXAM COLUMNS (outside the subjects loop — these build the header row)
    examColumns        every exam, in exam-date order
    examColumnsTerm1   just the Term I exams
    examColumnsTerm2   just the Term II exams
    examCount          how many exams in total
    examColumnsFit     truthy while the per-exam layout fits A4
    examColumnsOverflow truthy when it does not, so fall back to term totals

    Inside any of those loops: examName  examType  term  maxMarks

  MARKS — resolve ONLY inside the subjects loop
    name          the subject's name
    exams         one entry per exam, padded to line up with examColumns
    term1Exams    just this subject's Term I entries
    term2Exams    just this subject's Term II entries
      inside those loops: examName  obtained  maxMarks  grade
    term1.total   term2.total   grandTotal   grade

  SUMMARY (outside the loop — whole-card figures)
    attendance.str   total-marks   percentage   overall-grade   result
  ═══════════════════════════════════════════════════════════════════════
-->
<div class="rc">

  <!-- Header: logo left, school name centre, board logo right -->
  <table class="hdr">
    <tr>
      <td class="hdr-logo">{{school-logo}}</td>
      <td class="hdr-name">{{school-name}}</td>
      <td class="hdr-board">{{board-logo}}</td>
    </tr>
  </table>

  <div class="title">REPORT CARD</div>
  <div class="subtitle">Session {{session}}</div>

  <!-- Student details -->
  <table class="info">
    <tr>
      <td class="lbl">Name</td><td class="sep"></td><td class="val">{{student-name}}</td>
      <td class="lbl">Class</td><td class="sep"></td><td class="val">{{class}}</td>
      <td class="photo" rowspan="3"><div class="photo-box">{{student-photo}}</div></td>
    </tr>
    <tr>
      <td class="lbl">Roll No</td><td class="sep"></td><td class="val">{{rollNo}}</td>
      <td class="lbl">Admission No</td><td class="sep"></td><td class="val">{{admissionNumber}}</td>
    </tr>
    <tr>
      <td class="lbl">Father</td><td class="sep"></td><td class="val">{{father-name}}</td>
      <td class="lbl">Mother</td><td class="sep"></td><td class="val">{{mother-name}}</td>
    </tr>
  </table>

  <!-- ── Wide layout: one column per exam, grouped under its term ────────── -->
  {{#examColumnsFit}}
  <table class="sch">
    <tr>
      <th rowspan="2" class="subj-h">Subject</th>
      <th colspan="{{examCountTerm1}}">Term I</th>
      <th rowspan="2">Term I<br>Total</th>
      <th colspan="{{examCountTerm2}}">Term II</th>
      <th rowspan="2">Term II<br>Total</th>
      <th rowspan="2">Grand<br>Total</th>
      <th rowspan="2">Grade</th>
    </tr>
    <tr>
      {{#examColumnsTerm1}}<th class="ex">{{examName}}<br><span class="mx">{{maxMarks}}</span></th>{{/examColumnsTerm1}}
      {{#examColumnsTerm2}}<th class="ex">{{examName}}<br><span class="mx">{{maxMarks}}</span></th>{{/examColumnsTerm2}}
    </tr>
    {{#subjects}}
    <tr>
      <td class="subj">{{name}}</td>
      {{#term1Exams}}<td>{{obtained}}</td>{{/term1Exams}}
      <td class="tot">{{term1.total}}</td>
      {{#term2Exams}}<td>{{obtained}}</td>{{/term2Exams}}
      <td class="tot">{{term2.total}}</td>
      <td class="tot">{{grandTotal}}</td>
      <td>{{grade}}</td>
    </tr>
    {{/subjects}}
  </table>
  {{/examColumnsFit}}

  <!-- ── Narrow fallback: too many exams to fit A4, so term totals only ──── -->
  {{#examColumnsOverflow}}
  <p class="note">
    This class was assessed in {{examCount}} exams — more than fit across the page.
    Term totals are shown; the per-exam breakdown is available in the school office.
  </p>
  <table class="sch">
    <tr>
      <th class="subj-h">Subject</th>
      <th>Term I Total</th>
      <th>Term II Total</th>
      <th>Grand Total</th>
      <th>Grade</th>
    </tr>
    {{#subjects}}
    <tr>
      <td class="subj">{{name}}</td>
      <td class="tot">{{term1.total}}</td>
      <td class="tot">{{term2.total}}</td>
      <td class="tot">{{grandTotal}}</td>
      <td>{{grade}}</td>
    </tr>
    {{/subjects}}
  </table>
  {{/examColumnsOverflow}}

  <!-- Summary -->
  <table class="summary">
    <tr>
      <td class="pk">Total Marks</td><td class="bx">{{total-marks}}</td>
      <td class="pk">Percentage</td><td class="bx">{{percentage}}%</td>
      <td class="pk">Grade</td><td class="bx">{{overall-grade}}</td>
      <td class="pk">Result</td><td class="bx">{{result}}</td>
    </tr>
    <tr>
      <td class="pk">Attendance</td><td class="bx" colspan="7">{{attendance.str}}</td>
    </tr>
  </table>

  <!-- Signatures -->
  <table class="sign">
    <tr>
      <td>Class Teacher</td>
      <td>Examination In-charge</td>
      <td>Principal</td>
    </tr>
  </table>

</div>`;

export const PER_EXAM_TEMPLATE_CSS = `/* A4 page box. @page owns the margins — do not also pad .rc, or they stack. */
@page { size: A4 portrait; margin: 12mm 14mm; }

.rc { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; }
table { border-collapse: collapse; width: 100%; }

/* Header */
.hdr td { vertical-align: middle; padding: 2px 4px; }
.hdr-logo, .hdr-board { width: 24mm; text-align: center; }
.hdr-logo img, .hdr-board img { max-height: 20mm; max-width: 22mm; object-fit: contain; }
.hdr-name { text-align: center; font-size: 16pt; font-weight: 800; text-transform: uppercase; }

.title { text-align: center; font-size: 13pt; font-weight: 800; margin: 6px 0 2px; }
.subtitle { text-align: center; font-size: 9pt; font-weight: 600; margin-bottom: 8px; }

/* Student details */
.info td { padding: 3px 4px; font-size: 9pt; }
.info .lbl { font-weight: 700; white-space: nowrap; }
.info .sep { width: 8px; }
.info .val { border-bottom: 1px solid #000; }
.info .photo { width: 28mm; text-align: center; }
.photo-box { width: 26mm; height: 32mm; border: 1px solid #000; overflow: hidden; }
.photo-box img { width: 100%; height: 100%; object-fit: cover; }

/* Marks. table-layout:fixed keeps every exam column the same width however many
   there are, so two exams and six exams both stay inside the page box. */
.sch { table-layout: fixed; margin-top: 6px; }
.sch th, .sch td { border: 1px solid #000; padding: 3px 2px; text-align: center; font-size: 8.5pt; }
.sch th { background: #f0f0f0; font-weight: 700; }
/* The subject name needs room; the mark columns share what is left evenly. */
.sch .subj-h, .sch .subj { width: 34mm; text-align: left; font-weight: 600; }
/* Long exam names must wrap rather than force the table wider than the page. */
.sch .ex { font-size: 7.5pt; line-height: 1.15; word-break: break-word; }
.sch .mx { font-weight: 400; font-size: 7pt; }
.sch .tot { font-weight: 700; background: #fafafa; }

/* Shown only when the exam count exceeds what fits across A4 */
.note { font-size: 8pt; font-style: italic; margin: 6px 0 2px; }

/* Summary */
.summary { margin-top: 8px; }
.summary td { border: 1px solid #000; padding: 4px; font-size: 8.5pt; }
.summary .pk { font-weight: 700; background: #f7f7f7; white-space: nowrap; }
.summary .bx { text-align: center; }

/* Signatures */
.sign { margin-top: 18mm; }
.sign td { text-align: center; font-size: 8.5pt; font-weight: 600; border-top: 1px solid #000; padding-top: 4px; }`;

/**
 * What the editor actually loads. The Super Admin form exposes a single
 * htmlContent field ("inline CSS only — no separate stylesheet"), so the two
 * halves are shipped pre-joined with the CSS in a <style> block.
 */
export const PER_EXAM_TEMPLATE = `<style>
${PER_EXAM_TEMPLATE_CSS}
</style>

${PER_EXAM_TEMPLATE_HTML}`;

export default { PER_EXAM_TEMPLATE, PER_EXAM_TEMPLATE_HTML, PER_EXAM_TEMPLATE_CSS };
