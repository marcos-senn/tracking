const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { clerkMiddleware } = require('@clerk/express');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY
}));

// Rutas (Sin requireAuth para que funcione en local)
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/loads', require('./routes/loads'));

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