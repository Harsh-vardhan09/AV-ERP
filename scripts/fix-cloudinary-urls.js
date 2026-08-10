#!/usr/bin/env node
/* eslint-disable import/no-unresolved */
// Fix Cloudinary http:// -> https:// in several collections. Dry-run by default.
const mongoose = require('mongoose');
const argv = require('yargs').argv;
const env = require('../apps/api/src/core/config/env');

const MONGO =
  process.env.MONGO_URI || env.MONGO_URI || env.DATABASE_URL || process.env.DATABASE_URL;
if (!MONGO) {
  console.error(
    'No Mongo URI found. Set MONGO_URI or DATABASE_URL env or ensure apps/api/core/config/env exports it.'
  );
  process.exit(1);
}

const dryRun = !argv.apply;

async function run() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB', dryRun ? '(dry-run)' : '(apply)');

  const Assignment = require('../apps/api/src/modules/academics/models/assignment');
  const Assignmentupload = require('../apps/api/src/modules/academics/models/uploadassignment');
  const Leave = require('../apps/api/src/modules/communication/models/leave');

  const matchHttp = /http:\/\/res\.cloudinary\.com/i;

  // Assignments
  const assignments = await Assignment.find({ photo: { $regex: matchHttp } })
    .limit(1000)
    .lean();
  console.log('Assignments with http URLs:', assignments.length);
  assignments.slice(0, 5).forEach((a) => console.log(a._id, '->', a.photo));
  if (!dryRun) {
    for (const a of assignments) {
      const newUrl = a.photo.replace(
        /http:\/\/res\.cloudinary\.com/gi,
        'https://res.cloudinary.com'
      );
      await Assignment.updateOne({ _id: a._id }, { $set: { photo: newUrl } });
    }
  }

  // Assignment uploads
  const uploads = await Assignmentupload.find({ photo: { $regex: matchHttp } })
    .limit(1000)
    .lean();
  console.log('Assignmentupload docs with http URLs:', uploads.length);
  uploads.slice(0, 5).forEach((u) => console.log(u._id, '->', u.photo));
  if (!dryRun) {
    for (const u of uploads) {
      const newUrl = u.photo.replace(
        /http:\/\/res\.cloudinary\.com/gi,
        'https://res.cloudinary.com'
      );
      await Assignmentupload.updateOne({ _id: u._id }, { $set: { photo: newUrl } });
    }
  }

  // Leave documents (array)
  const leaves = await Leave.find({ documents: { $elemMatch: { $regex: matchHttp } } })
    .limit(1000)
    .lean();
  console.log('Leave docs with http URLs in documents array:', leaves.length);
  leaves.slice(0, 5).forEach((l) => console.log(l._id, '->', l.documents));
  if (!dryRun) {
    for (const l of leaves) {
      const fixed = (l.documents || []).map((d) =>
        typeof d === 'string'
          ? d.replace(/http:\/\/res\.cloudinary\.com/gi, 'https://res.cloudinary.com')
          : d
      );
      await Leave.updateOne({ _id: l._id }, { $set: { documents: fixed } });
    }
  }

  console.log('Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
