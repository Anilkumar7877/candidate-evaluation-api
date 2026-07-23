# Candidate Evaluation Engine API

A backend service for an internship/hiring pipeline: it stores candidates, scores and buckets them by priority, tracks reviewer evaluations and notes, and exposes a dashboard summary.

## Stack

- **Node.js + Express** for the API layer
- **SQLite via sql.js** for storage — a real SQL engine (SQLite compiled to WebAssembly), with zero native build dependencies. The database lives in a single file (`data/eval.sqlite`) and needs no separate server process to install or run.
- **swagger-jsdoc + swagger-ui-express** for interactive API docs

## Setup

```bash
npm install
npm run seed     # generates 120 sample candidates, evaluations, and notes
npm start         # starts the API on http://localhost:3000
```

Interactive docs: `http://localhost:3000/api-docs`
Postman collection: `docs/postman_collection.json` (import directly into Postman)

For local iteration, `npm run dev` restarts the server on file changes.

To start from a blank database, delete `data/eval.sqlite` and re-run `npm run seed`.

## Architecture

```
src/
  db/
    schema.sql        table definitions for candidates, evaluations, notes
    database.js       sql.js connection, query helpers (all/get/run), disk persistence
  routes/
    candidates.js      POST /candidates (single + bulk), GET /candidates, GET /candidates/:id
    evaluations.js      POST /evaluations/:candidateId
    notes.js            POST & GET /candidates/:candidateId/notes
    compare.js           GET /compare
    dashboard.js         GET /dashboard-summary
  middleware/
    AppError.js          typed error class (statusCode + code + message)
    errorHandler.js       central handler, returns structured JSON errors
  scoring.js             priority score + bucket calculation (single source of truth)
  validation.js          payload validation for candidates, evaluations, notes
  queryParser.js         filter/sort/pagination parsing for GET /candidates
  app.js                 express app wiring
  server.js              entrypoint: init DB, then listen
scripts/
  seed.js                generates the 120-candidate test dataset
docs/
  swagger.js             OpenAPI spec
  postman_collection.json
```

Each mutating route stays thin: validate the payload, run the query, persist, return the row. The scoring logic and validation rules live in their own modules so they're each defined once and reused everywhere they're needed, rather than duplicated across routes.

Every write persists the SQLite file to disk immediately, so data survives a server restart.

## Priority scoring

```
priority_score =
    0.30 × assignment_score
  + 0.25 × video_score
  + 0.20 × ats_score
  + 0.15 × github_score
  + 0.10 × communication_score
```

Bucket cutoffs (not specified in the brief, so defined here — see `src/scoring.js` to adjust):

| Score range | Bucket |
|---|---|
| ≥ 85 | P0 |
| 70–84.99 | P1 |
| 50–69.99 | P2 |
| < 50 | P3 |

## Assumptions and design decisions

A few places in the brief left room for interpretation. Here's what was assumed and why:

1. **Linking evaluations to the priority formula.** The formula only takes five candidate-level scores, but `POST /evaluations/:candidateId` is required to recalculate priority score, and the evaluation entity's fields (`ui_quality`, `state_handling`, etc.) don't map directly onto the formula. The assumption: a reviewer's `communication` rating on the evaluation is the source of truth for the candidate's `communication_score`. Submitting an evaluation updates that one field on the candidate record, then priority_score and priority_bucket are recalculated from there. This keeps the formula intact while still giving evaluations a real effect on ranking. Alternative interpretations (e.g. averaging all seven evaluation fields into a new score) would be a straightforward swap in `src/routes/evaluations.js` if the actual intent differs.

2. **Client-supplied candidate IDs.** IDs auto-increment by default, but the brief calls out "duplicate candidate IDs" as an error case to handle, which only makes sense if a client can supply one. `POST /candidates` accepts an optional `id` field; if given and already taken, it returns `409 DUPLICATE_CANDIDATE_ID`.

3. **Filter syntax.** The brief's example (`/candidates?assignment_score>70`) embeds a comparison operator directly in the query string with no `=`, which standard query-string parsing can't split on its own. `queryParser.js` re-reads the raw query string to catch this pattern (supporting `>`, `<`, `>=`, `<=`, `!=`) and separately handles ordinary `field=value` filters (e.g. `?status=shortlisted`). Filtering is restricted to an explicit allow-list of fields, returned in the error response if an unknown field is used.

4. **Compare with a missing id.** `GET /compare?ids=1,2,3` could fail the whole request if any id doesn't exist, or return what it can find. This implementation does the latter: found candidates are returned in full, missing ones are listed separately under `not_found`, so a comparison view still renders for whichever candidates are real.

5. **Notes as its own small CRUD surface.** The API Requirements section doesn't list a notes endpoint, but Notes is a core entity and the objective explicitly asks the system to "manage reviewer evaluations and notes." `POST` and `GET /candidates/:candidateId/notes` were added so the entity is actually reachable through the API.

## Error format

Every error response follows the same shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more candidate fields are invalid.",
    "details": ["assignment_score must be a number between 0 and 100"]
  }
}
```

Handled cases: invalid or out-of-range scores, missing required fields, duplicate candidate ids, candidate not found, invalid filter/sort fields, invalid pagination values, and unmatched routes.

## API summary

| Method & path | Purpose |
|---|---|
| `POST /candidates` | Create one candidate, or bulk-insert an array |
| `GET /candidates` | List with filtering, sorting, pagination |
| `GET /candidates/:id` | Full detail: candidate + evaluation + notes |
| `POST /evaluations/:candidateId` | Upsert evaluation, recalculate priority score |
| `POST /candidates/:candidateId/notes` | Add a reviewer note |
| `GET /candidates/:candidateId/notes` | List notes for a candidate |
| `GET /compare?ids=1,2,3` | Side-by-side comparison |
| `GET /dashboard-summary` | Pipeline counts by status and bucket |

Full request/response schemas: `/api-docs` (Swagger UI) once the server is running.

## Filtering & sorting reference

```
GET /candidates?assignment_score>70          numeric comparison (>, <, >=, <=, !=)
GET /candidates?status=shortlisted            exact match
GET /candidates?college=IIIT                  partial match (LIKE)
GET /candidates?sort=priority_score:desc      or ?sort=priority_score&order=desc
GET /candidates?page=2&limit=10               pagination (limit capped at 100)
```

## Pushing this to GitHub

This was built and tested locally. To publish it:

```bash
git init
git add .
git commit -m "Candidate Evaluation Engine API"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

`.gitignore` already excludes `node_modules/` and the seeded `data/eval.sqlite`, so a fresh clone just needs `npm install && npm run seed && npm start`.

## Video walkthrough

Not included in this package — see `VIDEO_WALKTHROUGH_SCRIPT.md` for a ready-to-read script covering architecture, the scoring logic, and a live demo of each endpoint, timed to fit a short walkthrough.
