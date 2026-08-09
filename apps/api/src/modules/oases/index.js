// Public API of the oases module.
//
// Nothing outside the module imports from it at runtime — the routes are the only
// entry point, reached through module.js. The seeds, tools and one-off migrations
// under apps/api/{seeds,tools,migrations} still require the models by path; those
// are scripts, not modules, and are deliberately not routed through here.
module.exports = {};
