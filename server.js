import express from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import RequestLog from './models/requestLog.js';

dotenv.config();

// Resolve __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- Basic config ---
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'change-this-to-strong-key';
const MONGO_URI = process.env.MONGO_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'bdc_api';

// Trust proxy if behind a reverse proxy (e.g. data center / nginx)
app.set('trust proxy', true);

// --- Middleware ---
app.use(express.json());
app.use(cors({ origin: '*', allowedHeaders: ['Content-Type', 'x-api-key'] }));
app.use(morgan('dev'));

// Serve static dashboard
app.use(express.static(path.join(__dirname, 'public')));

// --- DB Connect ---
if (!MONGO_URI) {
  console.error('❌ Missing MONGO_URI in .env');
  process.exit(1);
}
mongoose
  .connect(MONGO_URI, { dbName: MONGO_DB_NAME })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// --- Helpers ---
const getClientIp = (req) =>
  (req.headers['x-forwarded-for']?.split(',')[0] || req.ip || '').toString();

// API key protection for /api/* routes only (لا نحمي ملفات الواجهة)
app.use('/api', (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

// Rate limit على مسارات /api فقط
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 دقيقة
  max: 30,             // 30 طلب/دقيقة
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

// Log requests AFTER auth and BEFORE handlers (حتى لا نسجل طلبات مرفوضة كمقبولة)
app.use('/api', async (req, res, next) => {
  const start = Date.now();
  const ip = getClientIp(req);

  // Hook into response finish to record status
  res.on('finish', async () => {
    try {
      await RequestLog.create({
        endpoint: req.path,
        method: req.method,
        ip,
        status: res.statusCode,
        userAgent: req.headers['user-agent'] || 'unknown',
        timestamp: new Date()
      });
    } catch (e) {
      console.error('Log save error:', e.message);
    }
  });

  next();
});

// ------------------- API ROUTES ------------------- //

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime())
  });
});

// Weather endpoint (يعتمد على Node 18+ حيث fetch مدمج)
// أمثلة استخدام:
// /api/weather?lat=31.9566&lon=35.9457
// مصدر البيانات: open-meteo.com (بدون مفتاح)
app.get('/api/weather', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'lat & lon are required numbers' });
    }

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m`;

    const r = await fetch(url);
    if (!r.ok) {
      return res.status(502).json({ error: 'Weather upstream error' });
    }
    const data = await r.json();
    res.json({ source: 'open-meteo', lat, lon, data });
  } catch (err) {
    next(err);
  }
});

// Logs list (آخر 100)
app.get('/api/logs', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const logs = await RequestLog.find().sort({ timestamp: -1 }).limit(limit).lean();
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// ------------------- ERROR HANDLING ------------------- //
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('❌', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ------------------- START ------------------- //
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
