import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import RequestLog from './models/requestLog.js';

const app = express();

const PORT = process.env.PORT ?? 3000;
const API_KEY = process.env.API_KEY ?? 'my-secret-key';
const MONGO_URI = process.env.MONGO_URI;
let canLogRequests = false;

app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use((req, res, next) => {
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

app.use(async (req, res, next) => {
  if (!canLogRequests) {
    return next();
  }
  try {
    await RequestLog.create({
      endpoint: req.path,
      ip: req.ip,
    });
  } catch (err) {
    console.error('Failed to record request log', err);
  }
  next();
});

if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    .then(() => {
      canLogRequests = true;
      console.log('MongoDB connected');
    })
    .catch((err) => {
      console.error('MongoDB connection failed', err);
    });
} else {
  console.warn('MONGO_URI not set; request logging disabled');
}

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'BDC Weather API',
    time: new Date().toISOString(),
  });
});

app.get('/weather', (req, res) => {
  const city = (req.query.city ?? 'Amman').toString();
  res.json({
    city,
    temp_c: 22.5,
    condition: 'clear',
    source: 'stub',
    ts: Date.now(),
  });
});

app.listen(PORT, () => {
  console.log(`BDC Weather API running on http://localhost:${PORT}`);
});
