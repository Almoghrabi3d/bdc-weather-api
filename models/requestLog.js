import mongoose from 'mongoose';

const requestLogSchema = new mongoose.Schema({
  endpoint: { type: String, required: true },
  ip: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model('RequestLog', requestLogSchema);
