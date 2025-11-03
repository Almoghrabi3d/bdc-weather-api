// server.js
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

// resolve __dirname with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'change-this-to-strong-key';
const MONGO_URI = process.env.MONGO_URI;

// لو السيرفر خلف بروكسي
app.set('trust proxy', true);

// middlewares عامّة
app.use(express.json());
app.use(cors({ origin: '*', allowedHeaders: ['Content-Type', 'x-api-key'] }));
app.use(morgan('dev'));

// تقديم الملفات الثابتة (الواجهة)
app.use(express.static(path.join(__dirname, 'public')));

// اتصال بقاعدة البيانات
if (!MONGO_URI) {
  console.error('❌ Missing MONGO_URI in .env');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { dbName: 'bdc_api' })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// حماية مسارات /api بالمفتاح
app.use('/api', (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

// rate limit على /api فقط
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

// تسجيل الطلبات بعد قبولها
app.use('/api', async (req, res, next) => {
  const ip =
    (req.headers['x-forwarded-for']?.split(',')[0] ||
      req.ip ||
      '').toString();

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

// ---------------- API ROUTES ---------------- //

// health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime())
  });
});

// weather (مثال)
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

// ✅ logs مع فلترة وفرز وترقيم
app.get('/api/logs', async (req, res, next) => {
  try {
    // pagination
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || '20', 10), 1),
      100
    );
    const skip = (page - 1) * limit;

    // sorting
    const sortBy = req.query.sortBy || 'timestamp'; // timestamp | status | method
    const sortDir =
      (req.query.sortDir || 'desc').toLowerCase() === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortDir };

    // filters
    const q = {};

    // method=GET
    if (req.query.method) {
      q.method = req.query.method;
    }

    // statusClass=2xx|4xx|5xx
    if (req.query.statusClass) {
      const c = req.query.statusClass;
      if (c === '2xx') q.status = { $gte: 200, $lt: 300 };
      else if (c === '4xx') q.status = { $gte: 400, $lt: 500 };
      else if (c === '5xx') q.status = { $gte: 500, $lt: 600 };
    }

    // endpointContains
    if (req.query.endpointContains) {
      q.endpoint = { $regex: req.query.endpointContains, $options: 'i' };
    }

    // date range
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    if (from || to) {
      q.timestamp = {};
      if (from && !isNaN(from)) q.timestamp.$gte = from;
      if (to && !isNaN(to)) q.timestamp.$lte = to;
    }

    const [items, total] = await Promise.all([
      RequestLog.find(q).sort(sort).skip(skip).limit(limit).lean(),
      RequestLog.countDocuments(q)
    ]);

    const totalPages = Math.max(Math.ceil(total / limit), 1);

    res.json({
      items,
      page,
      limit,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      sortBy,
      sortDir: sortDir === 1 ? 'asc' : 'desc'
    });
  } catch (err) {
    next(err);
  }
});

// not found داخل /api
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// global error
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('❌', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
