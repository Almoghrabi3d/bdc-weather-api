// server.js
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// صحّة الخدمة
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "BDC Weather API", time: new Date().toISOString() });
});

// Endpoint تجريبي للطقس (Stub الآن — سنوصله بمصدر لاحقاً)
app.get("/weather", (req, res) => {
  const city = (req.query.city || "Amman").toString();
  // بيانات وهمية مؤقتاً — سنستبدلها لاحقًا ببيانات حقيقية أو من عقدة Testnet
  res.json({
    city,
    temp_c: 22.5,
    condition: "clear",
    source: "stub",
    ts: Date.now()
  });
});

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`BDC Weather API running on http://localhost:${PORT}`));
