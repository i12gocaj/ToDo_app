// routes/priorities.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todas las prioridades
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Priorities');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;