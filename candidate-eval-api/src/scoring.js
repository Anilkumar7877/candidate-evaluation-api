// Weighted priority score, as specified in the assignment brief.
const WEIGHTS = {
  assignment_score: 0.30,
  video_score: 0.25,
  ats_score: 0.20,
  github_score: 0.15,
  communication_score: 0.10,
};

function calculatePriorityScore(candidate) {
  const raw = Object.entries(WEIGHTS).reduce(
    (sum, [field, weight]) => sum + candidate[field] * weight,
    0
  );
  return Math.round(raw * 100) / 100;
}

// Bucket thresholds are not defined in the brief, so a straightforward
// quartile-style split is used here. See README "Assumptions" for the
// reasoning and how to adjust these cutoffs.
function calculatePriorityBucket(score) {
  if (score >= 85) return 'P0';
  if (score >= 70) return 'P1';
  if (score >= 50) return 'P2';
  return 'P3';
}

module.exports = { calculatePriorityScore, calculatePriorityBucket, WEIGHTS };
