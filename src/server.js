const { initDb } = require('./db/database');
const createApp = require('./app');

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => {
    const app = createApp();
    app.listen(PORT, () => {
      console.log(`Candidate Evaluation Engine API listening on port ${PORT}`);
      console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
