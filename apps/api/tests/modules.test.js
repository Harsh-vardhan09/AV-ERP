const fs = require('fs');
const path = require('path');
const express = require('express');

const MODULES_DIR = path.join(__dirname, '..', 'src', 'modules');

// The failure this exists to catch: a manifest points at a controller that was
// moved or never written, so `require` blows up or the router is not a router.
// It surfaced in production as routes that 404'd only after deploy, because
// nothing loaded the manifests until the app booted on Render.
//
// Mirrors moduleLoader.mountsOf: a module may carry no router of its own
// (attendance is models-only, people mounts entirely through extraMounts), and
// every extraMount is mounted independently.
test('every module manifest requires and its router mounts', () => {
  const names = fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(MODULES_DIR, e.name, 'module.js')))
    .map((e) => e.name);

  expect(names.length).toBeGreaterThan(0);

  const broken = [];

  for (const name of names) {
    try {
      const manifest = require(path.join(MODULES_DIR, name, 'module.js'));

      expect(typeof manifest.key).toBe('string');
      expect(typeof manifest.basePath).toBe('string');

      const mounts = [
        ...(manifest.routes ? [{ path: manifest.basePath, routes: manifest.routes }] : []),
        ...(manifest.extraMounts || []),
      ];

      // Mounting is the real assertion. express throws
      // "Router.use() requires a middleware function" if routes is undefined,
      // a plain object, or a controller that was never exported.
      for (const mount of mounts) {
        express().use(mount.path, mount.routes);
      }
    } catch (err) {
      broken.push(`${name}: ${err.message.split('\n')[0]}`);
    }
  }

  expect(broken).toEqual([]);
});
