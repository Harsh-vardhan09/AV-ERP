/**
 * Self-check for the report-card branding render path.
 * Run: node src/modules/reportcards/__tests__/reportCardBranding.check.js
 *
 * Covers the logic that isn't obvious by reading:
 *   - {{school-logo}} resolving to an <img> via the camelCase candidate
 *   - absent logo collapsing to nothing (no <img src="">)
 *   - the top-of-card fallback firing only when the template omits the token
 */
const assert = require('assert');
const TemplateParser = require('../services/templateParserService');

const LOGO = 'https://res.cloudinary.com/demo/image/upload/logo.png';
const withLogo = { schoolName: 'Demo Public School', schoolLogoUrl: LOGO };
const noLogo   = { schoolName: 'Demo Public School', schoolLogoUrl: '' };

// 1. {{school-logo}} renders an <img> pointing at the uploaded asset
{
  const { html } = TemplateParser.render('<header>{{school-logo}}</header>', withLogo);
  assert(html.includes(`src="${LOGO}"`), 'logo URL should be in the img src');
  assert(html.includes('rc-school-logo'), 'logo img should carry its class');
}

// 2. {{school-name}} resolves — it silently rendered empty before school data
//    was added to the aggregator
{
  const { html } = TemplateParser.render('<h1>{{school-name}}</h1>', withLogo);
  assert(html.includes('Demo Public School'), 'school name should resolve');
}

// 3. No logo uploaded → token collapses to nothing, never <img src="">
{
  const { html } = TemplateParser.render('<header>{{school-logo}}</header>', noLogo);
  assert(!html.includes('<img'), 'must not emit an img tag without a logo');
  assert(!html.includes('src=""'), 'must not emit an empty src');
}

// 4. Template without the token gets the logo prepended at the top
{
  const { html } = TemplateParser.render('<h1>{{school-name}}</h1>', withLogo);
  assert(html.startsWith('<div class="rc-logo-header"'), 'logo header should be prepended');
  assert(html.indexOf('rc-school-logo') < html.indexOf('<h1>'), 'logo must come first');
}

// 5. Template that positions the logo itself is NOT double-prepended
{
  const { html } = TemplateParser.render('<header>{{school-logo}}</header>', withLogo);
  assert(!html.includes('rc-logo-header'), 'must not prepend when template places the logo');
  assert(html.split('rc-school-logo').length - 1 === 1, 'logo should appear exactly once');
}

// 6. No logo AND no token → nothing injected
{
  const { html } = TemplateParser.render('<h1>{{school-name}}</h1>', noLogo);
  assert(!html.includes('rc-logo-header'), 'nothing to prepend without a logo');
}

// 7. {{school.logo}} / {{school-logo-url}} namespace access still works
{
  const { html } = TemplateParser.render('<img src="{{school-logo-url}}">', withLogo);
  assert(html.includes(`src="${LOGO}"`), 'bare URL token should resolve');
  assert(!html.includes('rc-logo-header'), 'url token also counts as placing the logo');
}

console.log('reportCardBranding.check.js — all assertions passed');
