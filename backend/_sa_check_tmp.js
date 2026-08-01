require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const SuperAdmin = require('./src/models/SuperAdmin');
  const rows = await SuperAdmin.find({}).select('email firstName lastName isActive createdAt lastLogin').lean();
  if (!rows.length) return console.log('NO SUPER ADMIN ACCOUNTS EXIST');
  rows.forEach(r => console.log(
    `email=${r.email}  active=${r.isActive}  name=${r.firstName} ${r.lastName}  created=${r.createdAt ? new Date(r.createdAt).toISOString().slice(0,10) : '-'}`
  ));
  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
