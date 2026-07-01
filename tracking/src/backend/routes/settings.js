const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');

// Obtener el revenue actual
router.get('/', async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({ totalRevenue: 0 });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Resetear el revenue a 0
router.post('/reset', async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({ totalRevenue: 0 });
    } else {
      setting.totalRevenue = 0;
      await setting.save();
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;