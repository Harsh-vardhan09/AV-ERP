/**
 * Starter report-card template shown in the Super Admin "Create Global Template"
 * editor.
 *
 * Every placeholder below is copied from the shipped
 * apps/api/src/modules/reportcards/templates/cbse_two_term_report_card.html,
 * so each one is known to resolve. If you add a token here, verify it against
 * templateParserService first — an unknown token renders empty and is listed in
 * the "⚠ Missing Fields" banner above the card.
 *
 * Two things trip people up, so they are demonstrated explicitly:
 *   1. {{school-logo}} expands to a complete <img> tag, NOT a URL. Use
 *      {{school-logo-url}} if you need the bare URL for a CSS background.
 *   2. Marks only resolve INSIDE the {{#subjects}} … {{/subjects}} loop. The same
 *      token outside the loop resolves to nothing.
 */

export const STARTER_TEMPLATE_HTML = `<!--
  ═══════════════════════════════════════════════════════════════════════
  STARTER REPORT CARD TEMPLATE

  Names below are written WITHOUT braces on purpose — a comment is not exempt
  from placeholder scanning, so writing them in braces here would add phantom
  entries to the "Missing Fields" banner. Wrap each name in double braces where
  you actually use it, exactly as the markup further down does.

  SCHOOL BRANDING (resolved per school — never hard-code these)
    school-logo       the school's uploaded logo, as a ready-made <img> tag
    school-logo-url   the bare URL, if you need it in CSS
    school-name       school name
    board-logo        board / affiliation logo, when uploaded

  STUDENT DETAILS
    student-name   rollNo   admissionNumber   dob
    father-name    mother-name   address
    class          session       student-photo

  MARKS — these resolve ONLY inside the subjects loop (see the table below)
    name         the subject's name
    Term I :     t1_pertest  t1_nb  t1_se  t1_halfyearly  t1_total
    Term II:     t2_pertest  t2_nb  t2_se  t2_yearly      t2_total
    Overall:     grandtotal  grade

    The t1_ / t2_ prefix is the TERM. What follows is the component name from
    the exam's marks distribution, so a school that configures a component
    called "oral" gets t1_oral instead of t1_pertest.

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

  <div class="title">ACADEMIC REPORT</div>
  <div class="subtitle">ACADEMIC SESSION : {{session}} &nbsp;|&nbsp; CLASS : {{class}}</div>

  <!-- Student details -->
  <table class="info">
    <tr>
      <td class="lbl">Name</td><td class="sep">:</td><td class="val">{{student-name}}</td>
      <td class="lbl">Roll No.</td><td class="sep">:</td><td class="val">{{rollNo}}</td>
      <td class="photo" rowspan="3"><div class="photo-box">{{student-photo}}</div></td>
    </tr>
    <tr>
      <td class="lbl">Father's Name</td><td class="sep">:</td><td class="val">{{father-name}}</td>
      <td class="lbl">Admission No.</td><td class="sep">:</td><td class="val">{{admissionNumber}}</td>
    </tr>
    <tr>
      <td class="lbl">Mother's Name</td><td class="sep">:</td><td class="val">{{mother-name}}</td>
      <td class="lbl">Date Of Birth</td><td class="sep">:</td><td class="val">{{dob}}</td>
    </tr>
  </table>

  <!-- Marks. One <tr> is emitted per subject; do not repeat it by hand. -->
  <table class="sch">
    <thead>
      <tr>
        <th rowspan="2">Subject</th>
        <th colspan="5">Term I</th>
        <th colspan="5">Term II</th>
        <th colspan="2">Overall</th>
      </tr>
      <tr>
        <th>Per Test</th><th>N.B</th><th>S.E</th><th>Half Yearly</th><th>Total</th>
        <th>Per Test</th><th>N.B</th><th>S.E</th><th>Yearly</th><th>Total</th>
        <th>Grand Total</th><th>Grade</th>
      </tr>
    </thead>
    <tbody>
      {{#subjects}}
      <tr>
        <td class="subj">{{name}}</td>
        <td>{{t1_pertest}}</td><td>{{t1_nb}}</td><td>{{t1_se}}</td><td>{{t1_halfyearly}}</td><td>{{t1_total}}</td>
        <td>{{t2_pertest}}</td><td>{{t2_nb}}</td><td>{{t2_se}}</td><td>{{t2_yearly}}</td><td>{{t2_total}}</td>
        <td>{{grandtotal}}</td><td>{{grade}}</td>
      </tr>
      {{/subjects}}
    </tbody>
  </table>

  <!-- Summary — outside the loop, so these are whole-card totals -->
  <table class="summary">
    <tr>
      <td class="pk">ATTENDANCE</td><td class="bx">{{attendance.str}}</td>
      <td class="pk">TOTAL</td><td class="bx">{{total-marks}}</td>
      <td class="pk">PERCENTAGE</td><td class="bx">{{percentage}}%</td>
      <td class="pk">GRADE</td><td class="bx">{{overall-grade}}</td>
      <td class="pk">RESULT</td><td class="bx">{{result}}</td>
    </tr>
  </table>

  <table class="sign">
    <tr>
      <td>Class Teacher</td><td>Examination In-charge</td><td>Principal</td>
    </tr>
  </table>

</div>`;

export const STARTER_TEMPLATE_CSS = `/* A4 page box. @page owns the margins — do not also pad .rc, or they stack. */
@page { size: A4 portrait; margin: 12mm 14mm; }

.rc { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; }
table { border-collapse: collapse; width: 100%; }

/* Header */
.hdr td { vertical-align: middle; padding: 2px 4px; }
.hdr-logo, .hdr-board { width: 24mm; text-align: center; }
/* {{school-logo}} injects an <img>; cap it so a large upload cannot blow up the page */
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

/* Marks */
.sch th, .sch td { border: 1px solid #000; padding: 3px; text-align: center; font-size: 8.5pt; }
.sch th { background: #f0f0f0; font-weight: 700; }
.sch .subj { text-align: left; font-weight: 600; }

/* Summary */
.summary { margin-top: 8px; }
.summary td { border: 1px solid #000; padding: 4px; font-size: 8.5pt; }
.summary .pk { font-weight: 700; background: #f7f7f7; white-space: nowrap; }
.summary .bx { text-align: center; }

/* Signatures */
.sign { margin-top: 22mm; }
.sign td { text-align: center; font-size: 8.5pt; font-weight: 600; border-top: 1px solid #000; padding-top: 4px; }`;

/**
 * What the editor actually loads. The Super Admin form exposes a single
 * htmlContent field ("inline CSS only — no separate stylesheet"), so the two
 * halves are shipped pre-joined with the CSS in a <style> block.
 */
export const STARTER_TEMPLATE = `<style>
${STARTER_TEMPLATE_CSS}
</style>

${STARTER_TEMPLATE_HTML}`;

export default { STARTER_TEMPLATE, STARTER_TEMPLATE_HTML, STARTER_TEMPLATE_CSS };
