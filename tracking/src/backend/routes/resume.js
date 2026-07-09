const express = require('express');
const router = express.Router();
const Load = require('../models/Load');
const Driver = require('../models/Driver');
const Setting = require('../models/Setting');

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

    // 2. Top Conductores
    const topDriversRaw = await Load.aggregate([
      { $match: { driverId: { $nin: [null, ""] } } },
      { $group: { _id: "$driverId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const topDrivers = [];
    for (const item of topDriversRaw) {
      const driver = await Driver.findById(item._id);
      if (driver) topDrivers.push({ driver: driver.driver, count: item.count });
    }

    // 3. Ingresos Diarios y cargas semanales por fecha de carga
    const loadsForCharts = await Load.find({}).select('createdAt rate');

    const dailyRevenueMap = new Map();
    const weeklyLoadsMap = new Map();

    const toDateKey = (value) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    loadsForCharts.forEach((load) => {
      const chartDate = toDateKey(load.createdAt) || toDateKey(load.puDate) || toDateKey(load.delDate);
      if (!chartDate) return;

      const revenue = Number(load.rate) || 0;
      dailyRevenueMap.set(chartDate, (dailyRevenueMap.get(chartDate) || 0) + revenue);
      weeklyLoadsMap.set(chartDate, (weeklyLoadsMap.get(chartDate) || 0) + 1);
    });

    const last14Days = [];
    const startDate = new Date(2026, 6, 5);

    for (let i = 0; i < 14; i += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      last14Days.push(`${yyyy}-${mm}-${dd}`);
    }

    const dailyRevenue = last14Days.map((date) => ({
      date,
      revenue: dailyRevenueMap.get(date) || 0
    }));

    const weeklyLoads = last14Days.map((week) => ({
      week,
      count: weeklyLoadsMap.get(week) || 0
    }));

    // 5. Historial (Cargas Delivered o Cancelled)
    const history = await Load.find({ 
      status: { $in: ['Delivered', 'Cancelled'] } 
    }).sort({ updatedAt: -1 }).limit(50);

    // 6. Contadores
    let setting = await Setting.findOne();
    if (!setting) setting = { totalRevenue: 0, completedLoads: 0, suspendedLoads: 0 };

    res.json({ 
      topDestinations, 
      topDrivers, 
      dailyRevenue, 
      weeklyLoads, 
      history, 
      counters: setting 
    });
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;