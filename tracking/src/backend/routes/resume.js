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

    // 3. Ingresos Diarios y cargas semanales por fecha agendada
    const loadsForCharts = await Load.find({
      $or: [
        { puDate: { $nin: [null, ""] } },
        { delDate: { $nin: [null, ""] } }
      ]
    }).select('puDate delDate rate');

    const dailyRevenueMap = new Map();
    const weeklyLoadsMap = new Map();

    loadsForCharts.forEach((load) => {
      const scheduledDate = load.puDate || load.delDate;
      if (!scheduledDate) return;

      const revenue = Number(load.rate) || 0;
      dailyRevenueMap.set(scheduledDate, (dailyRevenueMap.get(scheduledDate) || 0) + revenue);
      weeklyLoadsMap.set(scheduledDate, (weeklyLoadsMap.get(scheduledDate) || 0) + 1);
    });

    const last7Days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      last7Days.push(`${yyyy}-${mm}-${dd}`);
    }

    const dailyRevenue = last7Days.map((date) => ({
      date,
      revenue: dailyRevenueMap.get(date) || 0
    }));

    const weeklyLoads = last7Days.map((week) => ({
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