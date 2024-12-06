// routes/tasks.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // Asegúrate de que la configuración de la base de datos está correcta


// Obtener todas las tareas con sus subtareas
router.get('/', async (req, res) => {
  try {
    const [allTasks] = await db.query(`
      SELECT t.task_id, t.title, t.deadline_date, t.deadline_time, t.is_completed, t.completion_date,
             p.name AS priority_name, c.name AS category_name, t.parent_task_id,
             t.category_id, t.priority_id
      FROM Tasks t
      LEFT JOIN Priorities p ON t.priority_id = p.priority_id
      LEFT JOIN Categories c ON t.category_id = c.category_id
    `);

    // Separar tareas principales y subtareas
    const mainTasks = allTasks.filter(task => task.parent_task_id === null);
    const subTasks = allTasks.filter(task => task.parent_task_id !== null);

    // Asociar subtareas a sus tareas principales
    const tasksWithSubtasks = mainTasks.map(task => ({
      ...task,
      deadline_date: task.deadline_date ? task.deadline_date : null, // 'YYYY-MM-DD'
      subtasks: subTasks
        .filter(sub => sub.parent_task_id === task.task_id)
        .map(subtask => ({
          ...subtask,
          deadline_date: subtask.deadline_date ? subtask.deadline_date : null, // 'YYYY-MM-DD'
        })),
    }));

    res.json(tasksWithSubtasks);
  } catch (error) {
    console.error("Error al obtener tareas:", error);
    res.status(500).json({ error: error.message });
  }
});

// Agregar una nueva tarea o subtarea
router.post('/', async (req, res) => {
  let { title, deadline_date, deadline_time, priority_id, category_id, parent_task_id } = req.body;

  // Convertir cadenas vacías o undefined a null
  if (!deadline_date || deadline_date.trim() === '') {
    deadline_date = null;
  }

  if (!deadline_time || deadline_time.trim() === '') {
    deadline_time = null;
  }

  try {
    if (!title) {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    if (parent_task_id) {
      const [parentTask] = await db.query('SELECT * FROM Tasks WHERE task_id = ?', [parent_task_id]);
      if (parentTask.length === 0) {
        return res.status(400).json({ error: 'La tarea principal especificada no existe' });
      }
    }

    const [result] = await db.query(
      `
      INSERT INTO Tasks (title, deadline_date, deadline_time, priority_id, category_id, parent_task_id, is_completed, completion_date)
      VALUES (?, ?, ?, ?, ?, ?, 0, NULL)
      `,
      [title, deadline_date, deadline_time, priority_id || null, category_id || null, parent_task_id || null]
    );
    
    const [task] = await db.query(`
      SELECT t.task_id, t.title, t.deadline_date, t.deadline_time, t.is_completed, t.completion_date,
             p.name AS priority_name, c.name AS category_name, t.parent_task_id,
             t.category_id, t.priority_id
      FROM Tasks t
      LEFT JOIN Priorities p ON t.priority_id = p.priority_id
      LEFT JOIN Categories c ON t.category_id = c.category_id
      WHERE t.task_id = ?
    `, [result.insertId]);

    res.status(201).json(task[0]);
  } catch (error) {
    console.error("Error al agregar tarea:", error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar una tarea
// Actualizar una tarea
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  let { title, deadline_date, deadline_time, priority_id, category_id, is_completed } = req.body;
  try {
    // Obtener la tarea actual
    const [currentTaskRows] = await db.query('SELECT * FROM Tasks WHERE task_id = ?', [id]);

    if (currentTaskRows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const currentTask = currentTaskRows[0];

    // Determinar si la tarea es una tarea principal
    const isMainTask = currentTask.parent_task_id === null;

    // Determinar el nuevo estado de completado
    let newIsCompleted = currentTask.is_completed;
    let newCompletionDate = currentTask.completion_date;

    if (is_completed === 1 && currentTask.is_completed === 0) {
      newIsCompleted = 1;
      newCompletionDate = new Date(); // Establecer la fecha y hora actual
    } else if (is_completed === 0 && currentTask.is_completed === 1) {
      newIsCompleted = 0;
      newCompletionDate = null; // Limpiar la fecha de completado
    }

    // Preparar los campos a actualizar
    const fieldsToUpdate = [];
    const values = [];

    fieldsToUpdate.push('is_completed = ?');
    values.push(newIsCompleted);
    fieldsToUpdate.push('completion_date = ?');
    values.push(newCompletionDate);

    if (title !== undefined) {
      fieldsToUpdate.push('title = ?');
      values.push(title);
    }

    if (deadline_date !== undefined && deadline_date !== null) {
      fieldsToUpdate.push('deadline_date = ?');
      values.push(deadline_date);
    }

    if (deadline_time !== undefined && deadline_time !== null) {
      fieldsToUpdate.push('deadline_time = ?');
      values.push(deadline_time);
    }

    if (priority_id !== undefined) {
      fieldsToUpdate.push('priority_id = ?');
      values.push(priority_id);
    }

    if (category_id !== undefined) {
      fieldsToUpdate.push('category_id = ?');
      values.push(category_id);
    }

    values.push(id);

    const sql = `UPDATE Tasks SET ${fieldsToUpdate.join(', ')} WHERE task_id = ?`;

    // Ejecutar la consulta
    await db.query(sql, values);

    // Si es una tarea principal y se actualiza su estado, también actualizar subtareas
    if (isMainTask && (is_completed !== undefined)) {
      // Obtener subtareas
      const [subtasks] = await db.query('SELECT * FROM Tasks WHERE parent_task_id = ?', [id]);

      // Actualizar subtareas
      const subtaskPromises = subtasks.map(subtask => {
        return db.query(`
          UPDATE Tasks
          SET is_completed = ?, completion_date = ?
          WHERE task_id = ?
        `, [
          newIsCompleted,
          newIsCompleted ? new Date() : null,
          subtask.task_id
        ]);
      });

      await Promise.all(subtaskPromises);
    }

// Obtener la tarea actualizada
const [updatedTask] = await db.query(`
  SELECT t.task_id, t.title, t.deadline_date, t.deadline_time, t.is_completed, t.completion_date,
         p.name AS priority, c.name AS category, t.parent_task_id,
         t.category_id, t.priority_id
  FROM Tasks t
  LEFT JOIN Priorities p ON t.priority_id = p.priority_id
  LEFT JOIN Categories c ON t.category_id = c.category_id
  WHERE t.task_id = ?
`, [id]);

    res.status(200).json(updatedTask[0]);
  } catch (error) {
    console.error("Error al actualizar tarea:", error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar una tarea
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Primero, obtener la tarea para verificar si es una tarea principal
    const [taskRows] = await db.query('SELECT * FROM Tasks WHERE task_id = ?', [id]);

    if (taskRows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const task = taskRows[0];

    if (task.parent_task_id === null) {
      // Si es una tarea principal, también eliminar sus subtareas
      await db.query('DELETE FROM Tasks WHERE parent_task_id = ?', [id]);
    }

    // Eliminar la tarea principal o subtarea
    await db.query('DELETE FROM Tasks WHERE task_id = ?', [id]);

    res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar tarea:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;