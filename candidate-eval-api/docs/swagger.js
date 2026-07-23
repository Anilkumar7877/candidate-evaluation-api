const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Candidate Evaluation Engine API',
      version: '1.0.0',
      description:
        'Backend API for storing candidates, scoring and bucketing them by priority, ' +
        'recording reviewer evaluations and notes, and summarizing pipeline status.',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local development server' }],
    tags: [
      { name: 'Candidates' },
      { name: 'Evaluations' },
      { name: 'Notes' },
      { name: 'Compare' },
      { name: 'Dashboard' },
    ],
    components: {
      schemas: {
        Candidate: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Anil Kumar' },
            college: { type: 'string', example: 'IIIT Raichur' },
            assignment_score: { type: 'number', example: 88 },
            video_score: { type: 'number', example: 76 },
            ats_score: { type: 'number', example: 92 },
            github_score: { type: 'number', example: 81 },
            communication_score: { type: 'number', example: 74 },
            priority_score: { type: 'number', example: 83.85 },
            priority_bucket: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
            status: { type: 'string', enum: ['pending', 'reviewed', 'shortlisted', 'rejected'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        CandidateInput: {
          type: 'object',
          required: [
            'name',
            'assignment_score',
            'video_score',
            'ats_score',
            'github_score',
            'communication_score',
          ],
          properties: {
            name: { type: 'string' },
            college: { type: 'string' },
            assignment_score: { type: 'number', minimum: 0, maximum: 100 },
            video_score: { type: 'number', minimum: 0, maximum: 100 },
            ats_score: { type: 'number', minimum: 0, maximum: 100 },
            github_score: { type: 'number', minimum: 0, maximum: 100 },
            communication_score: { type: 'number', minimum: 0, maximum: 100 },
            status: { type: 'string', enum: ['pending', 'reviewed', 'shortlisted', 'rejected'] },
          },
        },
        Evaluation: {
          type: 'object',
          properties: {
            candidate_id: { type: 'integer' },
            ui_quality: { type: 'number' },
            state_handling: { type: 'number' },
            edge_case_thinking: { type: 'number' },
            architecture_understanding: { type: 'number' },
            communication: { type: 'number' },
            confidence: { type: 'number' },
            accessibility_awareness: { type: 'number' },
          },
        },
        Note: {
          type: 'object',
          properties: {
            candidate_id: { type: 'integer' },
            reviewer: { type: 'string' },
            note: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
    paths: {
      '/candidates': {
        post: {
          tags: ['Candidates'],
          summary: 'Create one candidate, or bulk-insert an array of candidates',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/CandidateInput' },
                    { type: 'array', items: { $ref: '#/components/schemas/CandidateInput' } },
                  ],
                },
              },
            },
          },
          responses: {
            201: { description: 'Created', content: { 'application/json': {} } },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            409: { description: 'Duplicate candidate id', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        get: {
          tags: ['Candidates'],
          summary: 'List candidates with filtering, sorting, and pagination',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'sort', in: 'query', schema: { type: 'string' }, description: 'e.g. priority_score or priority_score:desc' },
            { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            {
              name: 'assignment_score>N',
              in: 'query',
              schema: { type: 'string' },
              description: 'Comparison filters are embedded in the query string key, e.g. ?assignment_score>70. Supported operators: >, <, >=, <=, !=, =',
            },
          ],
          responses: { 200: { description: 'Paginated candidate list' } },
        },
      },
      '/candidates/{id}': {
        get: {
          tags: ['Candidates'],
          summary: 'Get full candidate detail, including evaluation and notes',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Candidate detail' },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/evaluations/{candidateId}': {
        post: {
          tags: ['Evaluations'],
          summary: "Submit or update a candidate's evaluation; recalculates priority score",
          parameters: [{ name: 'candidateId', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Evaluation' } } } },
          responses: {
            200: { description: 'Updated candidate and evaluation' },
            404: { description: 'Candidate not found' },
          },
        },
      },
      '/candidates/{candidateId}/notes': {
        post: {
          tags: ['Notes'],
          summary: 'Add a reviewer note to a candidate',
          parameters: [{ name: 'candidateId', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: { reviewer: { type: 'string' }, note: { type: 'string' } } } } },
          },
          responses: { 201: { description: 'Created note' } },
        },
        get: {
          tags: ['Notes'],
          summary: 'List all notes for a candidate',
          parameters: [{ name: 'candidateId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'List of notes' } },
        },
      },
      '/compare': {
        get: {
          tags: ['Compare'],
          summary: 'Compare multiple candidates side by side',
          parameters: [{ name: 'ids', in: 'query', required: true, schema: { type: 'string' }, description: 'Comma-separated ids, e.g. 1,2,3' }],
          responses: { 200: { description: 'Comparison result' } },
        },
      },
      '/dashboard-summary': {
        get: {
          tags: ['Dashboard'],
          summary: 'Pipeline-wide counts by status and priority bucket',
          responses: { 200: { description: 'Summary counts' } },
        },
      },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);
