// routes/categories.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todas las categorías activas
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Categories WHERE is_active = 1');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar una nueva categoría o reactivar una categoría inactiva
router.post('/', async (req, res) => {
  const { name } = req.body;
  try {
    // Verificar si la categoría ya existe
    const [existingCategoryRows] = await db.query('SELECT * FROM Categories WHERE name = ?', [name]);

    if (existingCategoryRows.length > 0) {
      const existingCategory = existingCategoryRows[0];
      if (existingCategory.is_active === 1) {
        // Si la categoría ya existe y está activa, devolver un error
        return res.status(400).json({ error: 'La categoría ya existe' });
      } else {
        // Si la categoría existe pero está inactiva, reactivarla
        await db.query('UPDATE Categories SET is_active = 1 WHERE category_id = ?', [existingCategory.category_id]);
        // Devolver la categoría reactivada
        return res.status(200).json({ category_id: existingCategory.category_id, name: existingCategory.name });
      }
    }

    // Si la categoría no existe, insertarla
    const [result] = await db.query('INSERT INTO Categories (name) VALUES (?)', [name]);
    res.status(201).json({ category_id: result.insertId, name });
  } catch (error) {
    console.error("Error al agregar categoría:", error);
    res.status(500).json({ error: error.message });
  }
});

// 'Eliminar' una categoría (marcarla como inactiva)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE Categories SET is_active = 0 WHERE category_id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error al marcar la categoría como inactiva:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;