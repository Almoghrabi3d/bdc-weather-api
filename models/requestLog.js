import mongoose from 'mongoose';

const requestLogSchema = new mongoose.Schema(
  {
    endpoint: { type: String, index: true },
    method: { type: String, index: true },
    ip: { type: String, index: true },
    status: { type: Number, default: 200 },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { versionKey: false }
);

export default mongoose.model('RequestLog', requestLogSchema);
