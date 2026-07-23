# Video Walkthrough Script

A talking-points script for the required walkthrough video. Read it in your own words rather than verbatim — aim for 4-6 minutes total. Have `npm start` running and Postman or the browser open before you start recording.

## 1. Intro (30 seconds)

"This is my submission for the Candidate Evaluation Engine assignment — a backend API that stores candidates, scores them, and lets reviewers manage evaluations and notes. It's built with Node.js, Express, and SQLite."

## 2. Architecture overview (60-90 seconds)

Share your screen on the `src/` folder.

- "Routes are split by resource: candidates, evaluations, notes, compare, dashboard."
- "The priority scoring formula lives in one file, `scoring.js`, so it's calculated the same way everywhere it's used — on creation and after every evaluation."
- "Validation and error handling are also centralized, so every error response comes back in the same shape: a code, a message, and details when relevant."
- "The database is SQLite, run through sql.js, so there's no separate database server to install — it's a single file on disk."

## 3. Priority scoring (30-45 seconds)

Open `scoring.js`.

- "The formula is fixed: 30% assignment score, 25% video, 20% ATS, 15% GitHub, 10% communication."
- "Buckets aren't specified in the brief, so I set thresholds myself — 85+ is P0, 70-84 is P1, and so on. That's documented in the README so it's easy to change."

## 4. Live demo — walk through each endpoint (2-3 minutes)

Use Postman (import `docs/postman_collection.json`) or curl.

1. `GET /candidates?limit=5` — "Here's the candidate list, paginated."
2. `GET /candidates?assignment_score>85&sort=priority_score:desc` — "And here's a filtered, sorted view — assignment score over 85, ranked by priority."
3. `GET /candidates/:id` — "Candidate detail pulls in their evaluation and notes together."
4. `POST /evaluations/:id` — "Submitting an evaluation updates their communication score and recalculates priority score and bucket automatically — watch the priority_score change in the response."
5. `POST /candidates/:id/notes` — "Reviewers can leave notes on a candidate."
6. `GET /compare?ids=1,2,3` — "This compares several candidates side by side, and reports back any ids that didn't exist rather than failing the whole request."
7. `GET /dashboard-summary` — "And this gives the overall pipeline counts — total, reviewed, shortlisted, pending, plus a breakdown by priority bucket."

## 5. Error handling (30 seconds)

- Send a candidate with an out-of-range score, or hit a nonexistent candidate id, to show the structured error response live.
- "Every error comes back with a code and a message, so a frontend can handle them predictably."

## 6. Assumptions and wrap-up (30-45 seconds)

- "A couple of things in the brief needed a judgment call — most notably how an evaluation feeds into the priority score, since the formula and the evaluation fields don't map 1:1. I documented my reasoning in the README's Assumptions section rather than guessing silently."
- "That's the submission — thanks for watching."
