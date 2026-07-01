const mongoose = require('mongoose');

const loadSchema = new mongoose.Schema({
  loadNumber: { type: String, required: true },
  driverId: { type: String },
  driverName: { type: String },
  truck: { type: String },
  status: { type: String, default: 'Booked' },
  rate: { type: Number },
  puCity: { type: String },
  puDate: { type: String },
  puTimeFrom: { type: String },
  puTimeTo: { type: String },
  delCity: { type: String },
  delDate: { type: String },
  delTimeFrom: { type: String },
  delTimeTo: { type: String },
  docsCreated: { type: Boolean, default: false },
  googlePuEventId: { type: String },
  googleDelEventId: { type: String },
  userId: { type: String } // <--- NUEVO CAMPO
}, { timestamps: true });

module.exports = mongoose.model('Load', loadSchema);