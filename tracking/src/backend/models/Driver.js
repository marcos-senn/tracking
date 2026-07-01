const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  driver: { type: String, required: true },
  company: { type: String, default: 'P&G Translog' },
  truck: { type: String },
  trailer: { type: String },
  cell: { type: String },
  vin: { type: String },
  status: { type: String, default: 'Available' }
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);