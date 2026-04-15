// ─── Express Server — Main Entry Point ───────────────────────────────────────
// All India Villages API | Bluestock Capstone
// Base URL: http://localhost:3000/v1/

require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const morgan       = require('morgan');
const errorHandler = require('./src/middleware/errorHandler');
const geoRoutes    = require('./src/routes/geo.routes');
const authRoutes   = require('./src/routes/auth.routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Core Middleware ──────────────────────────────────────────────────────────
// 10.3 Security Headers
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
    },
  },
  xFrameOptions: { action: 'deny' },
  xssFilter: true, // X-XSS-Protection: 1; mode=block
  noSniff: true,   // X-Content-Type-Options: nosniff
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-API-Secret'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'All India Villages API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
// Production:  https://api.villageapi.com/v1/
// Local:       http://localhost:3000/v1/
const adminRoutes  = require('./src/routes/admin.routes');
const portalRoutes = require('./src/routes/portal.routes');
app.use('/v1/auth', authRoutes);
app.use('/v1/admin', adminRoutes);
app.use('/v1/portal', portalRoutes);
app.use('/v1', geoRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` }
  });
});

// ─── Global Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

// ─── Start Server (Local Only) ────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🚀 All India Villages API running on http://localhost:${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🌐 Geo API:      http://localhost:${PORT}/v1/states\n`);
  });
}

module.exports = app;
