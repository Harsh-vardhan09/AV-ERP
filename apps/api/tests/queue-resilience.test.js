const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

/**
 * The API went 502 with "No open ports detected" because Redis started refusing
 * every command (Upstash request quota exhausted) and one Bull queue had no
 * 'error' listener. A Bull queue is an EventEmitter, so Node rethrew the
 * ReplyError as an uncaught exception — during bootJobs, which runs BEFORE
 * server.listen().
 *
 * These tests lock in the three things that made it fatal rather than noisy.
 */

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
};

const ALL_SRC = walk(SRC);

/** Strip comments so prose describing the old pattern is not read as code. */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

test('no module constructs a Bull queue directly — all go through the factory', () => {
  const offenders = ALL_SRC.filter((f) => {
    if (f.endsWith(path.join('core', 'queue', 'factory.js'))) return false; // the one place allowed
    return /new\s+Queue\s*\(/.test(stripComments(fs.readFileSync(f, 'utf8')));
  }).map((f) => path.relative(SRC, f).split(path.sep).join('/'));

  // createQueue applies REDIS_DISABLED, the 'error' handler and the low-traffic
  // polling settings. A raw `new Queue(...)` opts out of all three.
  expect(offenders).toEqual([]);
});

test('the factory attaches an error handler and low-traffic polling', () => {
  const src = fs.readFileSync(path.join(SRC, 'core/queue/factory.js'), 'utf8');

  expect(src).toMatch(/queue\.on\(\s*['"]error['"]/);
  expect(src).toMatch(/guardInterval/);
  expect(src).toMatch(/stalledInterval/);
  expect(src).toMatch(/drainDelay/);
});

test('bootJobs isolates a failing worker instead of killing the process', () => {
  const src = fs.readFileSync(path.join(SRC, 'core/moduleLoader.js'), 'utf8');
  const bootJobs = src.slice(src.indexOf('const bootJobs'));

  expect(bootJobs).toMatch(/try\s*\{/);
  expect(bootJobs).toMatch(/catch/);
});

// The stub stands in for a real queue when Redis is off. If it is missing a
// method a worker calls at require time, bootJobs throws a TypeError — the same
// crash-before-listen, just with a different message.
test('the disabled-Redis stub covers every Queue method the workers call', () => {
  const factory = fs.readFileSync(path.join(SRC, 'core/queue/factory.js'), 'utf8');
  const stub = factory.slice(
    factory.indexOf('const createStub'),
    factory.indexOf('const buildRedisOpts')
  );

  // Methods actually invoked on a queue anywhere in src/
  const used = new Set();
  for (const f of ALL_SRC) {
    const body = fs.readFileSync(f, 'utf8');
    for (const m of body.matchAll(/\b\w*[Qq]ueue\.(\w+)\s*\(/g)) used.add(m[1]);
  }

  // Only the ones the stub is responsible for standing in for.
  const mustCover = [
    'add',
    'process',
    'on',
    'getJobs',
    'getRepeatableJobs',
    'removeRepeatableByKey',
    'clean',
  ];
  const missing = mustCover.filter((m) => used.has(m) && !new RegExp(`\\b${m}\\s*:`).test(stub));

  expect(missing).toEqual([]);
});

test('the shared Redis probe client has an error listener', () => {
  const src = fs.readFileSync(path.join(SRC, 'core/config/redis.js'), 'utf8');
  const probe = src.slice(src.indexOf('const testRedisConnection'));
  expect(probe).toMatch(/client\.on\(\s*['"]error['"]/);
});
