const AppError = require('./middleware/AppError');

const SCORE_FIELDS = [
  'assignment_score',
  'video_score',
  'ats_score',
  'github_score',
  'communication_score',
];

const VALID_STATUSES = ['pending', 'reviewed', 'shortlisted', 'rejected'];

function isValidScore(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

// Validates a single candidate payload. Returns a list of human-readable
// issues; an empty list means the payload is valid.
function validateCandidatePayload(payload, { partial = false } = {}) {
  const issues = [];

  if (!partial) {
    if (!payload || typeof payload.name !== 'string' || !payload.name.trim()) {
      issues.push('name is required and must be a non-empty string');
    }
  }

  for (const field of SCORE_FIELDS) {
    const provided = payload && Object.prototype.hasOwnProperty.call(payload, field);
    if (!provided) {
      if (!partial) issues.push(`${field} is required`);
      continue;
    }
    if (!isValidScore(payload[field])) {
      issues.push(`${field} must be a number between 0 and 100`);
    }
  }

  if (payload && payload.status !== undefined && !VALID_STATUSES.includes(payload.status)) {
    issues.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (payload && payload.id !== undefined && !Number.isInteger(payload.id)) {
    issues.push('id must be an integer when provided explicitly');
  }

  return issues;
}

function assertValidCandidatePayload(payload, opts) {
  const issues = validateCandidatePayload(payload, opts);
  if (issues.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'One or more candidate fields are invalid.', issues);
  }
}

const EVALUATION_FIELDS = [
  'ui_quality',
  'state_handling',
  'edge_case_thinking',
  'architecture_understanding',
  'communication',
  'confidence',
  'accessibility_awareness',
];

function validateEvaluationPayload(payload) {
  const issues = [];
  if (!payload || typeof payload !== 'object') {
    return ['request body must be a JSON object'];
  }

  const presentFields = EVALUATION_FIELDS.filter((f) =>
    Object.prototype.hasOwnProperty.call(payload, f)
  );

  if (presentFields.length === 0) {
    issues.push(`at least one of: ${EVALUATION_FIELDS.join(', ')} must be provided`);
  }

  for (const field of presentFields) {
    if (!isValidScore(payload[field])) {
      issues.push(`${field} must be a number between 0 and 100`);
    }
  }

  return issues;
}

function assertValidEvaluationPayload(payload) {
  const issues = validateEvaluationPayload(payload);
  if (issues.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'One or more evaluation fields are invalid.', issues);
  }
}

function assertValidNotePayload(payload) {
  const issues = [];
  if (!payload || typeof payload.reviewer !== 'string' || !payload.reviewer.trim()) {
    issues.push('reviewer is required and must be a non-empty string');
  }
  if (!payload || typeof payload.note !== 'string' || !payload.note.trim()) {
    issues.push('note is required and must be a non-empty string');
  }
  if (issues.length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'One or more note fields are invalid.', issues);
  }
}

module.exports = {
  SCORE_FIELDS,
  VALID_STATUSES,
  isValidScore,
  assertValidCandidatePayload,
  assertValidEvaluationPayload,
  assertValidNotePayload,
};
