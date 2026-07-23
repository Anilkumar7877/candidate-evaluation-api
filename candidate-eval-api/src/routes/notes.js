const express = require('express');
const db = require('../db/database');
const AppError = require('../middleware/AppError');
const { assertValidNotePayload } = require('../validation');

// Mounted at /candidates/:candidateId/notes. Notes aren't in the explicit
// API list in the brief, but the brief does list "Notes" as a core entity
// and asks the system to "manage reviewer evaluations and notes" — so a
// small CRUD surface for them is added here rather than leaving the entity
// unreachable through the API.
const router = express.Router({ mergeParams: true });

router.post('/', (req, res) => {
  const { candidateId } = req.params;
  const candidate = db.get('SELECT id FROM candidates WHERE id = ?', [candidateId]);
  if (!candidate) {
    throw new AppError(404, 'CANDIDATE_NOT_FOUND', `No candidate with id ${candidateId}.`);
  }

  assertValidNotePayload(req.body);
  const timestamp = new Date().toISOString();

  const id = db.run(
    `INSERT INTO notes (candidate_id, reviewer, note, timestamp) VALUES (?, ?, ?, ?)`,
    [candidateId, req.body.reviewer, req.body.note, timestamp]
  );

  res.status(201).json(db.get('SELECT * FROM notes WHERE id = ?', [id]));
});

router.get('/', (req, res) => {
  const { candidateId } = req.params;
  const candidate = db.get('SELECT id FROM candidates WHERE id = ?', [candidateId]);
  if (!candidate) {
    throw new AppError(404, 'CANDIDATE_NOT_FOUND', `No candidate with id ${candidateId}.`);
  }

  const notes = db.all('SELECT * FROM notes WHERE candidate_id = ? ORDER BY timestamp DESC', [
    candidateId,
  ]);
  res.json(notes);
});

module.exports = router;
