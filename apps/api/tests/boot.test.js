const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

// main.js is the process entry point: requiring it binds a port and attaches a
// socket server. app.js below covers everything it would have pulled in.
const SELF_STARTING = new Set([path.join(SRC, 'main.js')]);

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (p.endsWith('.js') && !SELF_STARTING.has(p)) out.push(p);
  }
  return out;
};

// Requiring app.js alone would only prove the mounted graph resolves. Every file
// under src/ is required so a broken path in a file nothing imports yet still fails
// here rather than the first time someone wires it up.
// fees/models/FeeNotification.js registers the model name 'Notification', which
// notifications/models/Notification.js already owns. Nothing requires the fee one,
// so the app never loads both — this walk does. Delete the dead file or rename the
// model; until then a new entry here means a new collision.
const KNOWN_MODEL_COLLISIONS = ['modules/fees/models/FeeNotification.js'];

test('every file under src/ requires with no unresolved module', () => {
  const unresolved = [];
  const collisions = [];

  for (const file of walk(SRC)) {
    try {
      require(file);
    } catch (err) {
      const rel = path.relative(SRC, file).split(path.sep).join('/');
      if (err.code === 'MODULE_NOT_FOUND') {
        unresolved.push(`${rel} -> ${err.message.split('\n')[0]}`);
      } else if (err.name === 'OverwriteModelError') {
        collisions.push(rel);
      } else {
        throw err;
      }
    }
  }

  expect(unresolved).toEqual([]);
  expect(collisions).toEqual(KNOWN_MODEL_COLLISIONS);

  const app = require('../src/app.js');
  const mounted = app._router.stack.filter((l) => l.handle && l.handle.stack);
  expect(mounted.length).toBe(34);
});
