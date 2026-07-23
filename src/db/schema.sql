CREATE TABLE IF NOT EXISTS candidates (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  name                  TEXT NOT NULL,
  college               TEXT,
  assignment_score      REAL NOT NULL,
  video_score           REAL NOT NULL,
  ats_score             REAL NOT NULL,
  github_score          REAL NOT NULL,
  communication_score   REAL NOT NULL,
  priority_score        REAL NOT NULL,
  priority_bucket       TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending',
  created_at            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluations (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id                INTEGER NOT NULL,
  ui_quality                  REAL,
  state_handling              REAL,
  edge_case_thinking          REAL,
  architecture_understanding  REAL,
  communication                REAL,
  confidence                  REAL,
  accessibility_awareness     REAL,
  updated_at                  TEXT NOT NULL,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE TABLE IF NOT EXISTS notes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id  INTEGER NOT NULL,
  reviewer      TEXT NOT NULL,
  note          TEXT NOT NULL,
  timestamp     TEXT NOT NULL,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_priority_bucket ON candidates(priority_bucket);
CREATE INDEX IF NOT EXISTS idx_evaluations_candidate_id ON evaluations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_notes_candidate_id ON notes(candidate_id);
