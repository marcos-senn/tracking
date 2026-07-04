const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  totalRevenue: { type: Number, default: 0 },
  completedLoads: { type: Number, default: 0 },
  suspendedLoads: { type: Number, default: 0 }
});

module.exports = mongoose.model('Setting', settingSchema);