const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const total = db.get('SELECT COUNT(*) AS count FROM candidates').count;
  const reviewed = db.get("SELECT COUNT(*) AS count FROM candidates WHERE status = 'reviewed'").count;
  const shortlisted = db.get(
    "SELECT COUNT(*) AS count FROM candidates WHERE status = 'shortlisted'"
  ).count;
  const pending = db.get("SELECT COUNT(*) AS count FROM candidates WHERE status = 'pending'").count;

  const byBucket = db.all(
    'SELECT priority_bucket, COUNT(*) AS count FROM candidates GROUP BY priority_bucket'
  );

  res.json({
    total_candidates: total,
    reviewed_candidates: reviewed,
    shortlisted_candidates: shortlisted,
    pending_candidates: pending,
    by_priority_bucket: byBucket.reduce((acc, row) => {
      acc[row.priority_bucket] = row.count;
      return acc;
    }, { P0: 0, P1: 0, P2: 0, P3: 0 }),
  });
});

module.exports = router;
