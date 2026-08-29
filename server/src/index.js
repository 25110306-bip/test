require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { connectDb } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/error');

const authRoutes = require('./routes/auth');
const artistRoutes = require('./routes/artists');
const taskRoutes = require('./routes/tasks');
const voteRoutes = require('./routes/votes');
const meRoutes = require('./routes/me');
const legalRoutes = require('./routes/legal');
const leaderboardRoutes = require('./routes/leaderboards');
const compareRoutes = require('./routes/compare');
const battleRoutes = require('./routes/battles');
const adminRoutes = require('./routes/admin');
const integrationRoutes = require('./routes/integrations');
const aiRoutes = require('./routes/ai');
const botRoutes = require('./routes/bot');
const { startAutoIdolImport } = require('./utils/autoIdol');

const app = express();
const port = process.env.PORT || 5000;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));
app.use(cors({ origin: clientOrigin === '*' ? true : [clientOrigin, 'http://localhost:5173'], credentials: true }));
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
app.use(mongoSanitize());
app.use(hpp());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false });
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/bot', botRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/me', meRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/ai', aiRoutes);

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`[server] listening on ${port}`);
      startAutoIdolImport();
    });
  })
  .catch((err) => {
    console.error('[server] failed to start', err);
    process.exit(1);
  });
