const express = require('express');
const db = require('../db/database');
const AppError = require('../middleware/AppError');

const router = express.Router();

// GET /compare?ids=1,2,3
//
// Candidates that exist are returned in full (with their evaluation);
// any ids that don't exist are reported separately in `not_found` rather
// than failing the whole request, so a comparison view still renders for
// the candidates that were found.
router.get('/', (req, res) => {
  const raw = req.query.ids;
  if (!raw) {
    throw new AppError(400, 'MISSING_PARAMETER', 'ids query parameter is required, e.g. ?ids=1,2,3');
  }

  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const invalid = ids.filter((id) => !Number.isInteger(Number(id)));
  if (invalid.length) {
    throw new AppError(400, 'INVALID_PARAMETER', `ids must all be integers. Invalid: ${invalid.join(', ')}`);
  }

  const found = [];
  const notFound = [];

  for (const id of ids) {
    const candidate = db.get('SELECT * FROM candidates WHERE id = ?', [id]);
    if (!candidate) {
      notFound.push(Number(id));
      continue;
    }
    const evaluation = db.get('SELECT * FROM evaluations WHERE candidate_id = ?', [id]);
    found.push({ ...candidate, evaluation: evaluation || null });
  }

  res.json({
    candidates: found,
    not_found: notFound,
    highest_priority: found.length
      ? found.reduce((a, b) => (a.priority_score >= b.priority_score ? a : b)).id
      : null,
  });
});

module.exports = router;
