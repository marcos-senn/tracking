const express = require('express');
const router = express.Router();
const Broker = require('../models/Broker');

router.get('/', async (req, res) => {
  try {
    const brokers = await Broker.find().sort({ name: 1 });
    res.json({ brokers });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

router.post('/', async (req, res) => {
  try {
    const newBroker = new Broker(req.body.data);
    const savedBroker = await newBroker.save();
    res.status(201).json(savedBroker);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear broker' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updatedBroker = await Broker.findByIdAndUpdate(req.params.id, req.body.data, { new: true });
    res.json(updatedBroker);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar broker' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Broker.findByIdAndDelete(req.params.id);
    res.json({ message: 'Broker eliminado' });
  } catch (error) {
    res.status(400).json({ message: 'Error al eliminar broker' });
  }
});

module.exports = router;
