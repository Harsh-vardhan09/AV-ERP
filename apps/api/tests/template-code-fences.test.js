const {
  stripCodeFences,
  sanitizeTemplateHtml,
} = require('../src/modules/reportcards/lib/sanitizeTemplateHtml');
const TemplateParserService = require('../src/modules/reportcards/services/templateParserService');

describe('stripCodeFences', () => {
  test('removes the fences a pasted template arrives wrapped in', () => {
    const src = ['```html', '<table><tr><td>{{name}}</td></tr></table>', '```'].join('\n');
    const { html, removed, hadFences } = stripCodeFences(src);

    expect(hadFences).toBe(true);
    expect(removed).toBe(2);
    expect(html).not.toContain('```');
    expect(html).toContain('<table>');
  });

  test('handles bare fences, extra backticks and surrounding whitespace', () => {
    const src = ['  ```  ', '<div></div>', '````markup', '<p></p>', '   ```'].join('\n');
    expect(stripCodeFences(src).removed).toBe(3);
  });

  // Re-running the migration must not keep changing the document.
  test('is idempotent', () => {
    const src = '```html\n<table></table>\n```';
    const once = stripCodeFences(src).html;
    const twice = stripCodeFences(once);
    expect(twice.removed).toBe(0);
    expect(twice.html).toBe(once);
  });

  test('leaves a template that never had fences byte-identical', () => {
    const src = '<table><tr><td>{{name}}</td></tr></table>';
    const { html, hadFences } = stripCodeFences(src);
    expect(hadFences).toBe(false);
    expect(html).toBe(src);
  });

  // Inside <pre>/<code> a fence is content the author meant to show.
  test('preserves backticks inside pre and code blocks', () => {
    const src = ['<pre><code>', '```', 'sample', '```', '</code></pre>', '```', '<div></div>'].join(
      '\n'
    );
    const { html, removed } = stripCodeFences(src);

    expect(removed).toBe(1); // only the fence outside the code block
    expect(html).toContain('<pre><code>');
    expect((html.match(/```/g) || []).length).toBe(2); // the two inside survive
  });

  test('does not touch inline backticks in prose', () => {
    const src = '<p>Use the `name` token here.</p>';
    expect(stripCodeFences(src).removed).toBe(0);
  });

  test('sanitizeTemplateHtml reports a warning only when it changed something', () => {
    expect(sanitizeTemplateHtml('<div></div>').warning).toBeNull();
    const w = sanitizeTemplateHtml('```\n<div></div>\n```').warning;
    expect(w).toMatch(/Removed 2 markdown code fence/i);
  });
});

// The reason this matters: the fence does not render where it was written.
describe('why a stray fence surfaces above the table', () => {
  test('a fence left in place renders as text outside the table', () => {
    const dirty = '```html\n<table><tr><td>Marks</td></tr></table>\n```';
    const { html } = TemplateParserService.render(dirty, { subjects: [] });
    expect(html).toContain('```');

    const { html: cleanSrc } = stripCodeFences(dirty);
    const { html: rendered } = TemplateParserService.render(cleanSrc, { subjects: [] });
    expect(rendered).not.toContain('```');
    expect(rendered).toContain('<table>');
  });
});
