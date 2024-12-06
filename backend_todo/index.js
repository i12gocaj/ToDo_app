// index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const categoriesRoutes = require('./routes/categories');
const prioritiesRoutes = require('./routes/priorities');
const tasksRoutes = require('./routes/tasks');


dotenv.config();

const app = express();

// Configurar CORS para permitir solicitudes desde el frontend
app.use(cors({
  origin: 'http://localhost:3000', // Reemplaza con la URL de tu frontend si es diferente
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Middleware para parsear JSON
app.use(express.json());

// Rutas
app.use('/api/categories', categoriesRoutes);
app.use('/api/priorities', prioritiesRoutes);
app.use('/api/tasks', tasksRoutes);

// Iniciar el servidor
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});