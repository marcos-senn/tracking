const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');

// Obtener todos los conductores
router.get('/', async (req, res) => {
  try {
    const drivers = await Driver.find();
    res.json({ drivers });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Crear un conductor
router.post('/', async (req, res) => {
  try {
    const newDriver = new Driver(req.body.data);
    const savedDriver = await newDriver.save();
    res.status(201).json(savedDriver);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear conductor' });
  }
});

// Actualizar un conductor
router.put('/:id', async (req, res) => {
  try {
    const updatedDriver = await Driver.findByIdAndUpdate(req.params.id, req.body.data, { new: true });
    res.json(updatedDriver);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar' });
  }
});

// Eliminar un conductor
router.delete('/:id', async (req, res) => {
  try {
    await Driver.findByIdAndDelete(req.params.id);
    res.json({ message: 'Conductor eliminado' });
  } catch (error) {
    res.status(400).json({ message: 'Error al eliminar' });
  }
});

module.exports = router;