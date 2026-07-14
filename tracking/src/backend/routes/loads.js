const express = require('express');
const router = express.Router();
const Load = require('../models/Load');
const Driver = require('../models/Driver');
const Setting = require('../models/Setting');
const { google } = require('googleapis');
const { getAuth } = require('@clerk/express');
const { buildCalendarEventPayload } = require('../utils/googleCalendar');

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
    data.createdByName = data.createdByName || (userId ? `User ${userId.slice(0, 8)}` : 'Unknown');
    
    const newLoad = new Load(data);
    const savedLoad = await newLoad.save();

    // Una carga creada ya como completada también cuenta como revenue.
    if (savedLoad.status === 'Delivered' && savedLoad.rate) {
      let setting = await Setting.findOne();
      if (!setting) setting = await Setting.create({ totalRevenue: 0, completedLoads: 0, suspendedLoads: 0 });
      setting.totalRevenue += Number(savedLoad.rate);
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
      const puEvent = buildCalendarEventPayload({
        type: 'PU',
        loadNumber: data.loadNumber,
        driverName: data.driverName,
        city: data.puCity,
        date: data.puDate,
        timeFrom: data.puTimeFrom,
        timeTo: data.puTimeTo,
        truck: data.truck,
        rate: data.rate,
      });

      const puResponse = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        resource: puEvent,
      });
      savedLoad.googlePuEventId = puResponse.data.id;
    }

    if (data.delDate) {
      const delEvent = buildCalendarEventPayload({
        type: 'DEL',
        loadNumber: data.loadNumber,
        driverName: data.driverName,
        city: data.delCity,
        date: data.delDate,
        timeFrom: data.delTimeFrom,
        timeTo: data.delTimeTo,
        truck: data.truck,
        rate: data.rate,
      });

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

    const updateData = { ...req.body.data };
    // El creador de la carga no cambia al editarla: su revenue debe seguir
    // acreditándose al usuario que la creó.
    delete updateData.userId;
    delete updateData.createdByName;
    delete updateData.createdByEmail;

    const updatedLoad = await Load.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' });

    // El revenue solo incluye cargas completadas (Delivered).
    const oldRate = oldLoad.rate || 0;
    const newRate = updatedLoad.rate || 0;
    const oldWasCompleted = oldLoad.status === 'Delivered';
    const isCompleted = updatedLoad.status === 'Delivered';
    const revenueChange = (isCompleted ? newRate : 0) - (oldWasCompleted ? oldRate : 0);
    if (revenueChange !== 0) {
      let setting = await Setting.findOne();
      if (!setting) setting = await Setting.create({ totalRevenue: 0, completedLoads: 0, suspendedLoads: 0 });
      setting.totalRevenue += revenueChange;
      if (setting.totalRevenue < 0) setting.totalRevenue = 0;
      await setting.save();
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

    // Actualizar eventos de Google Calendar basado en cambios de estado
    if (oldStatus !== newStatus) {
      // Si cambia a "En Route to DEL", significa que el pickup ya se hizo - eliminar evento de pickup
      if (newStatus === 'En Route to DEL' && oldLoad.googlePuEventId) {
        try {
          await calendar.events.delete({ 
            calendarId: process.env.GOOGLE_CALENDAR_ID, 
            eventId: oldLoad.googlePuEventId 
          });
          updatedLoad.googlePuEventId = null;
        } catch (err) {
          console.warn('Error al eliminar evento de pickup:', err);
        }
      }

      // Si cambia a "At Delivery", también eliminar evento de pickup si existe
      if (newStatus === 'At Delivery' && oldLoad.googlePuEventId) {
        try {
          await calendar.events.delete({ 
            calendarId: process.env.GOOGLE_CALENDAR_ID, 
            eventId: oldLoad.googlePuEventId 
          });
          updatedLoad.googlePuEventId = null;
        } catch (err) {
          console.warn('Error al eliminar evento de pickup:', err);
        }
      }

      // Si cambia a "Delivered" o "Cancelled", eliminar ambos eventos
      if ((newStatus === 'Delivered' || newStatus === 'Cancelled')) {
        if (oldLoad.googlePuEventId) {
          try {
            await calendar.events.delete({ 
              calendarId: process.env.GOOGLE_CALENDAR_ID, 
              eventId: oldLoad.googlePuEventId 
            });
            updatedLoad.googlePuEventId = null;
          } catch (err) {
            console.warn('Error al eliminar evento de pickup:', err);
          }
        }
        if (oldLoad.googleDelEventId) {
          try {
            await calendar.events.delete({ 
              calendarId: process.env.GOOGLE_CALENDAR_ID, 
              eventId: oldLoad.googleDelEventId 
            });
            updatedLoad.googleDelEventId = null;
          } catch (err) {
            console.warn('Error al eliminar evento de delivery:', err);
          }
        }
      }
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

    await updatedLoad.save();
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

    if (load.status === 'Delivered' && load.rate) {
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
