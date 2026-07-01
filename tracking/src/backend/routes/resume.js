const express = require('express');
const router = express.Router();
const Load = require('../models/Load');

router.get('/', async (req, res) => {
  try {
    // 1. Top Destinos
    const topDestinations = await Load.aggregate([
      { $match: { delCity: { $ne: null, $ne: "" } } },
      { $group: { _id: "$delCity", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, city: "$_id", count: 1 } }
    ]);

    // 2. Top Conductores
    const topDrivers = await Load.aggregate([
      { $match: { driverName: { $ne: null, $ne: "" } } },
      { $group: { _id: "$driverName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, driver: "$_id", count: 1 } }
    ]);

    // 3. Ingresos Diarios (últimos 14 días con actividad)
    const dailyRevenue = await Load.aggregate([
      { $match: { delDate: { $ne: null, $ne: "" } } },
      { $group: { _id: "$delDate", revenue: { $sum: "$rate" } } },
      { $sort: { _id: 1 } },
      { $limit: 14 },
      { $project: { _id: 0, date: "$_id", revenue: 1 } }
    ]);

    // 4. Cargas Semanales (usamos delDate como referencia)
    const weeklyLoads = await Load.aggregate([
      { $match: { delDate: { $ne: null, $ne: "" } } },
      { $group: { _id: "$delDate", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 14 },
      { $project: { _id: 0, week: "$_id", count: 1 } }
    ]);

    res.json({ topDestinations, topDrivers, dailyRevenue, weeklyLoads });
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;