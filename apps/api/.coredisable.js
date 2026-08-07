const fs = require('fs');

const C = 'D:/AV-ERP/apps/api/src/core/';

const flag = (file, matcher, todo) => {
  const p = C + file;
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  const i = lines.findIndex(matcher);
  if (i < 0) throw new Error(`no match in ${file}`);
  const eol = lines[i].endsWith('\r') ? '\r' : '';
  const indent = lines[i].match(/^\s*/)[0];
  lines.splice(
    i,
    0,
    ...todo.map((t) => `${indent}// ${t}${eol}`),
    `${indent}// eslint-disable-next-line import/no-restricted-paths${eol}`
  );
  fs.writeFileSync(p, lines.join('\n'));
  console.log(`${file}: disabled`);
};

flag('pdf/htmlToPdf.js', (l) => /require\('\.\.\/\.\.\/modules\/reportcards'\)/.test(l), [
  'TODO: the one sanctioned core -> module import. Invert by having reportcards',
  'TODO: render the HTML and pass it in, leaving core owning only Puppeteer',
]);

flag('security/authenticate.js', (l) => /modules\/identity\/models\/user/.test(l), [
  'TODO: core -> module. Every request loads the user here, so identity cannot',
  'TODO: own it without an injection point. Pass a user loader into authenticate',
]);

flag('security/authorizeRoles.js', (l) => /modules\/people\/models\/StudentProfile/.test(l), [
  'TODO: core -> module, and it reaches past people/index.js. Route through the',
  'TODO: barrel first, then move this role check into the people module',
]);

flag('security/moduleGate.js', (l) => /modules\/tenancy'\)\.SchoolSettings/.test(l), [
  'TODO: core -> module. The gate reads per-school settings that tenancy owns',
  'TODO: invert by having tenancy register the gate factory with core at boot',
]);

flag('security/superAdminAuth.js', (l) => /modules\/tenancy"\)\.SuperAdmin/.test(l), [
  'TODO: core -> module, same inversion as moduleGate — tenancy owns SuperAdmin',
]);
