// models/requestLog.js
import mongoose from 'mongoose';

const requestLogSchema = new mongoose.Schema(
  {
    endpoint: { type: String, index: true },
    method: { type: String, index: true },
    ip: { type: String, index: true },
    status: { type: Number, default: 200, index: true },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { versionKey: false }
);

// فهارس إضافية لتحسين الفلترة والفرز
requestLogSchema.index({ timestamp: -1 });
requestLogSchema.index({ method: 1, status: 1 });
requestLogSchema.index({ endpoint: 1 });

export default mongoose.model('RequestLog', requestLogSchema);
