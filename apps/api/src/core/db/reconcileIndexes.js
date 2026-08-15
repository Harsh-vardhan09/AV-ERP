const mongoose = require('mongoose');
const logger = require('../logging/logger');

/**
 * Brings existing indexes into line with what the schemas declare.
 *
 * WHY THIS EXISTS
 *   Mongoose's autoIndex calls createIndex. If an index with the same name
 *   already exists but with DIFFERENT options, MongoDB answers
 *   IndexKeySpecsConflict and the old index survives — silently, on every boot,
 *   forever. Mongoose never drops-and-recreates on an options change.
 *
 *   That is how users.email_1_schoolId_1 stayed a plain unique index long after
 *   the schema had been corrected to a partial one, so every school's SECOND
 *   email-less student failed to register with:
 *     E11000 ... dup key: { email: null, schoolId: ... }
 *   No amount of redeploying fixed it, because redeploying is exactly the thing
 *   that could not fix it.
 *
 * SAFETY
 *   - Only indexes the SCHEMA declares are touched. An index created by hand or
 *     by a migration and not present in a schema is left completely alone.
 *   - Before dropping anything, the desired index is built under a temporary
 *     name. If the data cannot satisfy it (real duplicates), that build fails and
 *     the existing index is never dropped — the collection keeps its protection.
 *   - Never throws. A reconciliation problem must not stop the API booting.
 */

const sameKey = (a, b) => {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  return ak.length === bk.length && ak.every((k) => String(a[k]) === String(b[k]));
};

const norm = (v) => (v === undefined ? null : JSON.stringify(v));

/** Do the options that change an index's MEANING match? */
const sameOptions = (existing, wanted) =>
  Boolean(existing.unique) === Boolean(wanted.unique) &&
  norm(existing.partialFilterExpression) === norm(wanted.partialFilterExpression) &&
  Boolean(existing.sparse) === Boolean(wanted.sparse);

/**
 * Documents that would break a unique index before it is built.
 * Honours partialFilterExpression, so rows the index would not cover are ignored
 * — that is the whole point of the fix being applied here.
 */
async function findViolations(coll, key, options) {
  const fields = Object.keys(key);
  const groupId = Object.fromEntries(fields.map((f) => [f.replace(/\./g, '_'), `$${f}`]));

  const pipeline = [];
  if (options.partialFilterExpression) pipeline.push({ $match: options.partialFilterExpression });
  pipeline.push(
    { $group: { _id: groupId, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
    { $limit: 5 }
  );

  return coll.aggregate(pipeline).toArray();
}

async function reconcileModel(model) {
  const declared = model.schema.indexes(); // [[key, options], ...]
  if (!declared.length) return [];

  const coll = model.collection;
  let existing;
  try {
    existing = await coll.indexes();
  } catch (err) {
    // Collection does not exist yet — autoIndex will create everything cleanly.
    if (err.codeName === 'NamespaceNotFound') return [];
    throw err;
  }

  const fixed = [];

  for (const [key, options = {}] of declared) {
    const current = existing.find((i) => i.name !== '_id_' && sameKey(i.key, key));
    if (!current) continue; // missing entirely — autoIndex will create it
    if (sameOptions(current, options)) continue; // already correct

    const name = current.name;

    logger.warn('[Indexes] Stale index detected', {
      collection: coll.collectionName,
      index: name,
      existing: {
        unique: Boolean(current.unique),
        partial: current.partialFilterExpression || null,
      },
      wanted: { unique: Boolean(options.unique), partial: options.partialFilterExpression || null },
    });

    // Cannot build the replacement alongside the old one to test it: MongoDB
    // refuses two indexes on the same key pattern whatever they are named. So
    // check the DATA first, then drop and rebuild, and put the old index back if
    // the rebuild fails — the collection must never be left unprotected.
    if (options.unique) {
      const dupes = await findViolations(coll, key, options);
      if (dupes.length) {
        logger.error('[Indexes] Cannot rebuild index — existing documents violate it', {
          collection: coll.collectionName,
          index: name,
          examples: dupes.slice(0, 3),
          hint: 'Resolve these duplicates, then redeploy. The old index is left in place.',
        });
        continue;
      }
    }

    try {
      await coll.dropIndex(name);
      await coll.createIndex(key, { ...options, name });
      logger.info('[Indexes] Rebuilt stale index', {
        collection: coll.collectionName,
        index: name,
      });
      fixed.push(`${coll.collectionName}.${name}`);
    } catch (err) {
      logger.error('[Indexes] Rebuild failed — restoring the previous index', {
        collection: coll.collectionName,
        index: name,
        error: err.message,
      });
      // Rebuild the ORIGINAL spec so the collection keeps the protection it had.
      await coll
        .createIndex(current.key, {
          name,
          unique: current.unique,
          sparse: current.sparse,
          ...(current.partialFilterExpression && {
            partialFilterExpression: current.partialFilterExpression,
          }),
        })
        .catch((e) =>
          logger.error('[Indexes] Could not restore the previous index', { error: e.message })
        );
    }
  }

  return fixed;
}

/**
 * Reconcile every registered model. Called once at boot, after connect().
 * @returns {Promise<string[]>} names of the indexes that were rebuilt
 */
async function reconcileIndexes() {
  const fixed = [];
  for (const name of mongoose.modelNames()) {
    try {
      fixed.push(...(await reconcileModel(mongoose.model(name))));
    } catch (err) {
      logger.error('[Indexes] Reconciliation failed for a model (continuing)', {
        model: name,
        error: err.message,
      });
    }
  }
  if (fixed.length) {
    logger.warn(`[Indexes] Rebuilt ${fixed.length} stale index(es): ${fixed.join(', ')}`);
  }
  return fixed;
}

module.exports = { reconcileIndexes, reconcileModel };
