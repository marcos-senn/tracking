const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { clerkMiddleware, requireAuth } = require('@clerk/express');

const app = express();

// Middlewares
app.use(cors({
  origin: ['https://tracking-4mmr.vercel.app', 'http://localhost:5173']
}));
app.use(express.json()); // Asegúrate de tener esto antes de las rutas
app.use(clerkMiddleware({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY
}));

// Ruta de prueba para verificar que el servidor está vivo
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor funcionando correctamente' });
});

// Rutas de la API
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/loads', require('./routes/loads'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/resume', require('./routes/resume'));

// Conectar a MongoDB y levantar servidor
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error conectando a MongoDB:', error.message);
  });