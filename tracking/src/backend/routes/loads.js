const express = require('express');
const router = express.Router();
const Load = require('../models/Load');
const Driver = require('../models/Driver');
const Setting = require('../models/Setting');
const { google } = require('googleapis');
const { getAuth } = require('@clerk/express');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

function getEndTime(startTime) {
  if (!startTime) return '09:00';
  const [h, m] = startTime.split(':').map(Number);
  let newH = h + 1;
  if (newH >= 24) newH = 23;
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Obtener todas las cargas
router.get('/', async (req, res) => {
  try {
    const loads = await Load.find();
    res.json({ loads });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Crear una carga
router.post('/', async (req, res) => {
  try {
    const data = req.body.data;
    const { userId } = getAuth(req);
    data.userId = userId;
    
    const newLoad = new Load(data);
    const savedLoad = await newLoad.save();

    if (data.rate) {
      let setting = await Setting.findOne();
      if (!setting) setting = await Setting.create({ totalRevenue: 0, completedLoads: 0, suspendedLoads: 0 });
      setting.totalRevenue += Number(data.rate);
      await setting.save();
    }

    if (data.driverId) {
      const driver = await Driver.findById(data.driverId);
      if (driver) {
        data.driverName = driver.driver;
        data.truck = driver.truck;
        if (['Booked', 'En Route to PU', 'At Pickup', 'En Route to DEL', 'At Delivery'].includes(data.status)) {
          driver.status = 'En Route';
          await driver.save();
        }
      }
    }

    if (data.puDate) {
      const puStart = data.puTimeFrom || '08:00';
      const puEnd = data.puTimeTo || getEndTime(puStart);
      const puStartDateTime = `${data.puDate}T${puStart}:00`;
      const puEndDateTime = `${data.puDate}T${puEnd}:00`;

      const puEvent = {
        summary: `PU - Load #${data.loadNumber} - ${data.driverName || 'Unassigned'}`,
        location: data.puCity,
        description: `Truck: ${data.truck || 'N/A'}, Rate: $${data.rate || 0}`,
        start: { dateTime: puStartDateTime, timeZone: 'America/Chicago' }, 
        end: { dateTime: puEndDateTime, timeZone: 'America/Chicago' },
      };

      const puResponse = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        resource: puEvent,
      });
      savedLoad.googlePuEventId = puResponse.data.id;
    }

    if (data.delDate) {
      const delStart = data.delTimeFrom || '08:00';
      const delEnd = data.delTimeTo || getEndTime(delStart);
      const delStartDateTime = `${data.delDate}T${delStart}:00`;
      const delEndDateTime = `${data.delDate}T${delEnd}:00`;

      const delEvent = {
        summary: `DEL - Load #${data.loadNumber} - ${data.driverName || 'Unassigned'}`,
        location: data.delCity,
        description: `Truck: ${data.truck || 'N/A'}, Rate: $${data.rate || 0}`,
        start: { dateTime: delStartDateTime, timeZone: 'America/Chicago' },
        end: { dateTime: delEndDateTime, timeZone: 'America/Chicago' },
      };

      const delResponse = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        resource: delEvent,
      });
      savedLoad.googleDelEventId = delResponse.data.id;
    }

    await savedLoad.save();
    res.status(201).json(savedLoad);
  } catch (error) {
    console.error('Error al crear carga/evento:', error);
    res.status(400).json({ message: 'Error al crear carga' });
  }
});

// Actualizar una carga
router.put('/:id', async (req, res) => {
  try {
    const oldLoad = await Load.findById(req.params.id);
    if (!oldLoad) return res.status(404).json({ message: 'Carga no encontrada' });

    const { userId } = getAuth(req);
    if (oldLoad.userId !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para editar esta carga' });
    }

    const updatedLoad = await Load.findByIdAndUpdate(req.params.id, req.body.data, { returnDocument: 'after' });

    // Lógica de Revenue
    const oldRate = oldLoad.rate || 0;
    const newRate = updatedLoad.rate || 0;
    if (oldRate !== newRate) {
      let setting = await Setting.findOne();
      if (setting) {
        setting.totalRevenue += (newRate - oldRate);
        if (setting.totalRevenue < 0) setting.totalRevenue = 0;
        await setting.save();
      }
    }

    // Lógica de Contadores de Historial
    const oldStatus = oldLoad.status;
    const newStatus = updatedLoad.status;
    if (oldStatus !== newStatus) {
      let setting = await Setting.findOne();
      if (!setting) setting = await Setting.create({});
      if (newStatus === 'Delivered') setting.completedLoads += 1;
      if (newStatus === 'Cancelled') setting.suspendedLoads += 1;
      await setting.save();
    }

    // Liberar conductor si la carga se completó o canceló
    const oldDriverId = oldLoad.driverId ? oldLoad.driverId.toString() : null;
    const newDriverId = updatedLoad.driverId ? updatedLoad.driverId.toString() : null;

    if (oldDriverId && oldDriverId !== newDriverId) {
      await Driver.findByIdAndUpdate(oldDriverId, { status: 'Available' });
    }

    if (newDriverId) {
      const driver = await Driver.findById(newDriverId);
      if (driver) {
        updatedLoad.driverName = driver.driver;
        updatedLoad.truck = driver.truck;
        if (['Delivered', 'Cancelled'].includes(updatedLoad.status)) {
          driver.status = 'Available';
        } else {
          driver.status = 'En Route';
        }
        await driver.save();
        await updatedLoad.save();
      }
    }

    res.json(updatedLoad);
  } catch (error) {
    console.error('Error al actualizar:', error);
    res.status(400).json({ message: 'Error al actualizar' });
  }
});

// Eliminar una carga
router.delete('/:id', async (req, res) => {
  try {
    const load = await Load.findById(req.params.id);
    if (!load) return res.status(404).json({ message: 'Carga no encontrada' });

    const { userId } = getAuth(req);
    if (load.userId !== userId) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar esta carga' });
    }

    if (load.rate) {
      let setting = await Setting.findOne();
      if (setting) {
        setting.totalRevenue -= Number(load.rate);
        if (setting.totalRevenue < 0) setting.totalRevenue = 0;
        await setting.save();
      }
    }

    if (load.driverId) {
      await Driver.findByIdAndUpdate(load.driverId, { status: 'Available' });
    }

    if (load.googlePuEventId) {
      try { await calendar.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: load.googlePuEventId }); } catch (err) {}
    }
    if (load.googleDelEventId) {
      try { await calendar.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId: load.googleDelEventId }); } catch (err) {}
    }

    await Load.findByIdAndDelete(req.params.id);
    res.json({ message: 'Carga y eventos eliminados' });
  } catch (error) {
    console.error('Error al eliminar:', error);
    res.status(400).json({ message: 'Error al eliminar' });
  }
});

module.exports = router;