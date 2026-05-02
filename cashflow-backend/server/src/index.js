require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');

const authRoutes         = require('./routes/auth');
const invoiceRoutes      = require('./routes/invoices');
const dashboardRoutes    = require('./routes/dashboard');
const declarationRoutes  = require('./routes/declarations');
const reportRoutes       = require('./routes/reports');
const adminRoutes        = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Wrap async route handlers to catch unhandled promise rejections
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Health check
app.get('/up', (_req, res) => res.json({ status: 'ok', service: 'cashflow-api', version: '2.0' }));

// Routes
app.use('/api/v1',                authRoutes);
app.use('/api/v1/invoices',       invoiceRoutes);
app.use('/api/v1/dashboard',      dashboardRoutes);
app.use('/api/v1/declarations',   declarationRoutes);
app.use('/api/v1/reports',        reportRoutes);
app.use('/api/v1/admin',          adminRoutes);

// Global error handler — logs full error details
app.use((err, _req, res, _next) => {
  console.error('=== SERVER ERROR ===');
  console.error(err.stack || err.message);
  console.error('===================');
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ ABZ Tax API running on http://0.0.0.0:${PORT}`);
  console.log(`  Login: admin@cashflow.et / password`);
});
