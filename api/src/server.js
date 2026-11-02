require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDatabase } = require('./config/database');
const errorHandler = require('./middleware/errorhandler');

const routes = require('./routes');

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', routes);

app.use(errorHandler);

// only start listening when this file is run directly (node src/server.js)
// when imported by tests, we just export the app without binding any port
if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  async function startServer() {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }

  startServer();
}

module.exports = app;
