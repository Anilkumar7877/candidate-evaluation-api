const express = require('express');
const db = require('../db/database');
const AppError = require('../middleware/AppError');
const { assertValidCandidatePayload } = require('../validation');
const { calculatePriorityScore, calculatePriorityBucket } = require('../scoring');
const { parseFilters, parseSort, parsePagination } = require('../queryParser');

const router = express.Router();

function insertCandidate(payload) {
  const priority_score = calculatePriorityScore(payload);
  const priority_bucket = calculatePriorityBucket(priority_score);
  const created_at = new Date().toISOString();
  const status = payload.status || 'pending';

  if (payload.id !== undefined) {
    const existing = db.get('SELECT id FROM candidates WHERE id = ?', [payload.id]);
    if (existing) {
      throw new AppError(409, 'DUPLICATE_CANDIDATE_ID', `Candidate id ${payload.id} already exists.`);
    }
  }

  const id = db.run(
    `INSERT INTO candidates
      (id, name, college, assignment_score, video_score, ats_score, github_score,
       communication_score, priority_score, priority_bucket, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.id ?? null,
      payload.name,
      payload.college ?? null,
      payload.assignment_score,
      payload.video_score,
      payload.ats_score,
      payload.github_score,
      payload.communication_score,
      priority_score,
      priority_bucket,
      status,
      created_at,
    ]
  );

  return db.get('SELECT * FROM candidates WHERE id = ?', [id]);
}

// POST /candidates — supports a single object or an array (bulk insert).
router.post('/', (req, res) => {
  const isBulk = Array.isArray(req.body);
  const payloads = isBulk ? req.body : [req.body];

  if (isBulk && payloads.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Bulk insert requires at least one candidate.');
  }

  // Validate everything before writing anything, so a bad record in a
  // bulk batch doesn't leave a partial set of rows behind.
  payloads.forEach((p, i) => {
    try {
      assertValidCandidatePayload(p);
    } catch (err) {
      if (err instanceof AppError) {
        err.message = `Candidate at index ${i}: ${err.message}`;
      }
      throw err;
    }
  });

  const created = payloads.map(insertCandidate);
  res.status(201).json(isBulk ? created : created[0]);
});

// GET /candidates — filtering, sorting, and pagination.
router.get('/', (req, res) => {
  const { whereClause, params } = parseFilters(req);
  const orderClause = parseSort(req);
  const { page, limit, offset } = parsePagination(req);

  const total = db.get(`SELECT COUNT(*) AS count FROM candidates ${whereClause}`, params).count;
  const rows = db.all(
    `SELECT * FROM candidates ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json({
    data: rows,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /candidates/:id
router.get('/:id', (req, res) => {
  const candidate = db.get('SELECT * FROM candidates WHERE id = ?', [req.params.id]);
  if (!candidate) {
    throw new AppError(404, 'CANDIDATE_NOT_FOUND', `No candidate with id ${req.params.id}.`);
  }

  const evaluation = db.get('SELECT * FROM evaluations WHERE candidate_id = ?', [req.params.id]);
  const notes = db.all('SELECT * FROM notes WHERE candidate_id = ? ORDER BY timestamp DESC', [
    req.params.id,
  ]);

  res.json({ ...candidate, evaluation: evaluation || null, notes });
});

module.exports = router;
