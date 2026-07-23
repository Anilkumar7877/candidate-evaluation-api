const express = require('express');
const db = require('../db/database');
const AppError = require('../middleware/AppError');
const { assertValidEvaluationPayload } = require('../validation');
const { calculatePriorityScore, calculatePriorityBucket } = require('../scoring');

const router = express.Router();

// POST /evaluations/:candidateId
//
// The brief's priority-score formula only takes the five candidate-level
// scores, but this endpoint is also required to "automatically recalculate
// priority score" whenever an evaluation comes in. The evaluation entity
// doesn't map 1:1 onto those five fields, so the assumption made here is:
// a reviewer's `communication` rating on the evaluation is the source of
// truth for the candidate's `communication_score`. Submitting an evaluation
// updates that field on the candidate record, then priority_score and
// priority_bucket are recalculated from the (now updated) candidate row.
// See README "Assumptions" for the full reasoning.
router.post('/:candidateId', (req, res) => {
  const { candidateId } = req.params;
  const candidate = db.get('SELECT * FROM candidates WHERE id = ?', [candidateId]);
  if (!candidate) {
    throw new AppError(404, 'CANDIDATE_NOT_FOUND', `No candidate with id ${candidateId}.`);
  }

  assertValidEvaluationPayload(req.body);

  const {
    ui_quality = null,
    state_handling = null,
    edge_case_thinking = null,
    architecture_understanding = null,
    communication = null,
    confidence = null,
    accessibility_awareness = null,
  } = req.body;

  const updated_at = new Date().toISOString();
  const existing = db.get('SELECT id FROM evaluations WHERE candidate_id = ?', [candidateId]);

  if (existing) {
    db.run(
      `UPDATE evaluations SET
        ui_quality = COALESCE(?, ui_quality),
        state_handling = COALESCE(?, state_handling),
        edge_case_thinking = COALESCE(?, edge_case_thinking),
        architecture_understanding = COALESCE(?, architecture_understanding),
        communication = COALESCE(?, communication),
        confidence = COALESCE(?, confidence),
        accessibility_awareness = COALESCE(?, accessibility_awareness),
        updated_at = ?
       WHERE candidate_id = ?`,
      [
        ui_quality,
        state_handling,
        edge_case_thinking,
        architecture_understanding,
        communication,
        confidence,
        accessibility_awareness,
        updated_at,
        candidateId,
      ]
    );
  } else {
    db.run(
      `INSERT INTO evaluations
        (candidate_id, ui_quality, state_handling, edge_case_thinking,
         architecture_understanding, communication, confidence, accessibility_awareness, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        candidateId,
        ui_quality,
        state_handling,
        edge_case_thinking,
        architecture_understanding,
        communication,
        confidence,
        accessibility_awareness,
        updated_at,
      ]
    );
  }

  // Recalculate the candidate's priority score, folding in the evaluation's
  // communication rating if one was provided.
  const updatedCandidate = {
    ...candidate,
    communication_score: communication ?? candidate.communication_score,
  };
  const priority_score = calculatePriorityScore(updatedCandidate);
  const priority_bucket = calculatePriorityBucket(priority_score);

  db.run(
    `UPDATE candidates SET communication_score = ?, priority_score = ?, priority_bucket = ? WHERE id = ?`,
    [updatedCandidate.communication_score, priority_score, priority_bucket, candidateId]
  );

  const evaluation = db.get('SELECT * FROM evaluations WHERE candidate_id = ?', [candidateId]);
  const candidateNow = db.get('SELECT * FROM candidates WHERE id = ?', [candidateId]);

  res.json({ candidate: candidateNow, evaluation });
});

module.exports = router;
