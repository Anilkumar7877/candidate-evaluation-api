const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('../docs/swagger');
const candidatesRouter = require('./routes/candidates');
const evaluationsRouter = require('./routes/evaluations');
const notesRouter = require('./routes/notes');
const compareRouter = require('./routes/compare');
const dashboardRouter = require('./routes/dashboard');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({ name: 'Candidate Evaluation Engine API', docs: '/api-docs', health: 'ok' });
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use('/candidates', candidatesRouter);
  app.use('/candidates/:candidateId/notes', notesRouter);
  app.use('/evaluations', evaluationsRouter);
  app.use('/compare', compareRouter);
  app.use('/dashboard-summary', dashboardRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
