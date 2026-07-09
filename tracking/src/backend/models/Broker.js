const mongoose = require('mongoose');

const brokerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  setUp: { type: Boolean, default: false },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Broker', brokerSchema);
