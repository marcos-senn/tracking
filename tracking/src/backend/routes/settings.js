const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');

// Obtener los contadores
router.get('/', async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({ totalRevenue: 0, completedLoads: 0, suspendedLoads: 0 });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Resetear contadores
router.post('/reset', async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({ totalRevenue: 0, completedLoads: 0, suspendedLoads: 0 });
    } else {
      // Resetea solo lo que se pide
      if (req.body.type === 'revenue') setting.totalRevenue = 0;
      if (req.body.type === 'completed') setting.completedLoads = 0;
      if (req.body.type === 'suspended') setting.suspendedLoads = 0;
      await setting.save();
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;