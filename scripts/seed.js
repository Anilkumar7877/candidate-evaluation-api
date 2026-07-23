const { initDb, run, get, all } = require('../src/db/database');
const { calculatePriorityScore, calculatePriorityBucket } = require('../src/scoring');

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Rohan',
  'Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Myra', 'Anika', 'Ira', 'Riya', 'Kiara', 'Meera',
  'Rahul', 'Karan', 'Nikhil', 'Sanjay', 'Varun', 'Priya', 'Neha', 'Pooja', 'Sneha', 'Divya',
];
const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Iyer', 'Nair', 'Reddy', 'Rao', 'Patel', 'Mehta', 'Kumar',
  'Singh', 'Das', 'Chatterjee', 'Bose', 'Joshi', 'Desai', 'Pillai', 'Menon', 'Kapoor', 'Malhotra',
];
const COLLEGES = [
  'IIIT Raichur', 'IIT Bombay', 'IIT Delhi', 'BITS Pilani', 'NIT Trichy', 'IIIT Hyderabad',
  'VIT Vellore', 'NIT Warangal', 'IIT Madras', 'DTU Delhi', 'IIIT Bangalore', 'IIT Kanpur',
];
const STATUSES = ['pending', 'reviewed', 'shortlisted', 'rejected'];
const REVIEWERS = ['Deepak Pawar', 'Shriyash Rao', 'Meera Krishnan', 'Amit Sen'];
const SAMPLE_NOTES = [
  'Strong grasp of edge cases, code was clean and well-tested.',
  'Communication could be sharper during the walkthrough.',
  'Good architecture instincts, but state handling had a few bugs.',
  'Confident presenter, handled follow-up questions well.',
  'Needs to work on accessibility basics before shortlisting.',
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function randomScore() {
  // Skewed slightly toward the middle-to-upper range so the dataset looks
  // like a real applicant pool rather than pure noise.
  return Math.round((randomInt(40, 100) + randomInt(40, 100)) / 2 * 100) / 100;
}

async function seed() {
  await initDb();

  const existing = get('SELECT COUNT(*) AS count FROM candidates').count;
  if (existing > 0) {
    console.log(`Database already has ${existing} candidates. Skipping seed.`);
    console.log('Delete data/eval.sqlite and re-run to reseed from scratch.');
    return;
  }

  const COUNT = 120;
  for (let i = 0; i < COUNT; i += 1) {
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const candidate = {
      name,
      college: pick(COLLEGES),
      assignment_score: randomScore(),
      video_score: randomScore(),
      ats_score: randomScore(),
      github_score: randomScore(),
      communication_score: randomScore(),
      status: pick(STATUSES),
    };

    const priority_score = calculatePriorityScore(candidate);
    const priority_bucket = calculatePriorityBucket(priority_score);
    const created_at = new Date(Date.now() - randomInt(0, 30) * 86400000).toISOString();

    const id = run(
      `INSERT INTO candidates
        (name, college, assignment_score, video_score, ats_score, github_score,
         communication_score, priority_score, priority_bucket, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        candidate.name,
        candidate.college,
        candidate.assignment_score,
        candidate.video_score,
        candidate.ats_score,
        candidate.github_score,
        candidate.communication_score,
        priority_score,
        priority_bucket,
        candidate.status,
        created_at,
      ]
    );

    // Give roughly 70% of candidates an evaluation record and a note or two,
    // so the seeded data exercises every endpoint out of the box.
    if (Math.random() < 0.7) {
      run(
        `INSERT INTO evaluations
          (candidate_id, ui_quality, state_handling, edge_case_thinking,
           architecture_understanding, communication, confidence, accessibility_awareness, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          randomScore(),
          randomScore(),
          randomScore(),
          randomScore(),
          randomScore(),
          randomScore(),
          randomScore(),
          new Date().toISOString(),
        ]
      );
    }

    if (Math.random() < 0.5) {
      run(`INSERT INTO notes (candidate_id, reviewer, note, timestamp) VALUES (?, ?, ?, ?)`, [
        id,
        pick(REVIEWERS),
        pick(SAMPLE_NOTES),
        new Date().toISOString(),
      ]);
    }
  }

  console.log(`Seeded ${COUNT} candidates (plus evaluations and notes) into data/eval.sqlite`);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
