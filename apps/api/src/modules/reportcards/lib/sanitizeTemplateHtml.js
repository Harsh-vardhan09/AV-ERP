/**
 * Strips markdown code fences from template HTML.
 *
 * Templates are usually pasted out of a chat window or a doc, which wraps the
 * markup in ```html … ``` fences. The fences are stored verbatim, and at render
 * time they land as bare text nodes. If a fence sits between <table> and <tr>,
 * the HTML parser cannot keep it there — text is not valid table content — so it
 * FOSTER-PARENTS the text out of the table and drops it immediately above.
 * That is why the stray ``` appears above every table rather than where it was
 * written, and why it survives any amount of CSS.
 *
 * Only whole fence lines are removed. A fence-looking sequence inside a <code>
 * or <pre> block is left alone: that is content, not packaging.
 */

// A fence is three or more backticks alone on a line, optionally followed by an
// info string (```html, ```HTML, ```markup …). Leading/trailing space allowed.
const FENCE_LINE = /^[ \t]*`{3,}[ \t]*[a-zA-Z0-9_-]*[ \t]*$/;

/** Regions we must not touch — a fence inside them is intentional content. */
const PROTECTED = /<(pre|code)\b[\s\S]*?<\/\1>/gi;

/**
 * @param {string} html
 * @returns {{ html: string, removed: number, hadFences: boolean }}
 */
function stripCodeFences(html) {
  if (typeof html !== 'string' || !html.includes('```')) {
    return { html: html ?? '', removed: 0, hadFences: false };
  }

  // Park protected regions so their content cannot match FENCE_LINE, then put
  // them back untouched. A placeholder that could itself appear in user markup
  // would corrupt the document, so it carries a random suffix.
  const token = `__FENCE_KEEP_${Math.random().toString(36).slice(2)}__`;
  const parked = [];
  const parkedHtml = html.replace(PROTECTED, (m) => {
    parked.push(m);
    return `${token}${parked.length - 1}${token}`;
  });

  let removed = 0;
  const cleaned = parkedHtml
    .split('\n')
    .filter((line) => {
      if (FENCE_LINE.test(line)) {
        removed++;
        return false;
      }
      return true;
    })
    .join('\n');

  const restored = cleaned.replace(
    new RegExp(`${token}(\\d+)${token}`, 'g'),
    (_, i) => parked[Number(i)]
  );

  return { html: restored, removed, hadFences: removed > 0 };
}

/**
 * Convenience for save paths: returns the cleaned HTML and a warning to hand
 * back to the author, or null when nothing was found.
 */
function sanitizeTemplateHtml(html) {
  const { html: cleaned, removed, hadFences } = stripCodeFences(html);
  return {
    html: cleaned,
    warning: hadFences
      ? `Removed ${removed} markdown code fence line(s) (\`\`\`) from the template HTML. ` +
        `Left in place they render as stray text above every table.`
      : null,
  };
}

module.exports = { stripCodeFences, sanitizeTemplateHtml };
