const express = require('express');
const router = express.Router();
const Load = require('../models/Load');
const Driver = require('../models/Driver'); // <-- Importamos Driver

router.get('/', async (req, res) => {
  try {
    // 1. Top Destinos
    const topDestinations = await Load.aggregate([
      { $match: { delCity: { $nin: [null, "", "Unassigned"] } } },
      { $group: { _id: "$delCity", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, city: "$_id", count: 1 } }
    ]);

    // 2. Top Conductores (Buscando por ID real)
    const topDriversRaw = await Load.aggregate([
      { $match: { driverId: { $nin: [null, ""] } } },
      { $group: { _id: "$driverId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const topDrivers = [];
    for (const item of topDriversRaw) {
      const driver = await Driver.findById(item._id);
      if (driver) {
        topDrivers.push({ driver: driver.driver, count: item.count });
      }
    }

    // 3. Ingresos Diarios
    const dailyRevenue = await Load.aggregate([
      { $match: { delDate: { $nin: [null, ""] } } },
      { $group: { _id: "$delDate", revenue: { $sum: "$rate" } } },
      { $sort: { _id: 1 } },
      { $limit: 14 },
      { $project: { _id: 0, date: "$_id", revenue: 1 } }
    ]);

    // 4. Cargas Semanales
    const weeklyLoads = await Load.aggregate([
      { $match: { delDate: { $nin: [null, ""] } } },
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