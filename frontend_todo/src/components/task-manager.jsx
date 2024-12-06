"use client";
import { useState, useEffect } from "react";
import axios from 'axios'; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarIcon,
  Clock,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  FileBarChart,
} from "lucide-react";
import { format, isValid, parseISO, parse } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function TaskManagerComponent() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDeadlineDate, setNewDeadlineDate] = useState(undefined);
  const [newDeadlineTime, setNewDeadlineTime] = useState("");
  const [newPriority, setNewPriority] = useState(""); // Almacena priority_id
  const [editingTask, setEditingTask] = useState(null);
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [newCustomCategory, setNewCustomCategory] = useState("");
  const [errors, setErrors] = useState({});
  const [expandedTasks, setExpandedTasks] = useState([]);
  const [newSubtasks, setNewSubtasks] = useState({}); // Estado para subtareas por tarea
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("all"); // Almacenar como 'all' o category_id
  const [filterPriority, setFilterPriority] = useState("all"); // Almacenar como 'all' o priority_id
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [startDate, setStartDate] = useState(undefined);
  const [endDate, setEndDate] = useState(undefined);

  useEffect(() => {
    document.body.classList.toggle("dark", isDarkMode);
    // Eliminar la manipulación directa de estilos
  }, [isDarkMode]);

  useEffect(() => {
    fetchCategories();
    fetchPriorities();
    fetchTasks();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/categories');
      setCategories(response.data);
    } catch (error) {
      console.error("Error al obtener categorías:", error.response ? error.response.data : error.message);
    }
  };

  const fetchPriorities = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/priorities');
      // Ordenar las prioridades por 'priority_id'
      const sortedPriorities = response.data.sort((a, b) => a.priority_id - b.priority_id);
      setPriorities(sortedPriorities);
    } catch (error) {
      console.error("Error al obtener prioridades:", error.response ? error.response.data : error.message);
      toast({
        variant: "destructive",
        title: "Error al obtener prioridades",
        description: "Por favor, intenta nuevamente.",
      });
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/tasks');
      console.log("Datos de tareas recibidos:", response.data);
  
      const processedTasks = response.data.map(task => {
        let deadline_date = null;
        if (task.deadline_date && task.deadline_date.trim() !== '') {
          deadline_date = task.deadline_date.includes('T') ? task.deadline_date.split('T')[0] : task.deadline_date;
        }
        return {
          ...task,
          deadline_date,
          deadline_time: task.deadline_time || null,
          priority: task.priority_name,
          category: task.category_name,
          subtasks: task.subtasks ? task.subtasks.map(subtask => {
            let subtask_deadline_date = null;
            if (subtask.deadline_date && subtask.deadline_date.trim() !== '') {
              subtask_deadline_date = subtask.deadline_date.includes('T') ? subtask.deadline_date.split('T')[0] : subtask.deadline_date;
            }
            return {
              ...subtask,
              deadline_date: subtask_deadline_date,
              deadline_time: subtask.deadline_time || null,
            };
          }) : [],
        };
      });
  
      setTasks(processedTasks);
      console.log("Estado de tasks actualizado:", processedTasks);
    } catch (error) {
      console.error("Error al obtener tareas:", error.response ? error.response.data : error.message);

    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (newTask.trim() === "") newErrors.task = "Task title is required";
    if (newCategory === "") newErrors.category = "Category is required";
    if (!newDeadlineDate) newErrors.date = "Deadline date is required";
    if (newDeadlineTime === "") newErrors.time = "Deadline time is required";
    if (newPriority === "") newErrors.priority = "Priority is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addTask = async () => {
    if (validateForm()) {
      const formattedDeadlineDate = newDeadlineDate ? format(newDeadlineDate, 'yyyy-MM-dd') : null;
      const formattedDeadlineTime = newDeadlineTime
        ? newDeadlineTime.length === 5
          ? `${newDeadlineTime}:00`
          : newDeadlineTime
        : null;
  
      const task = {
        title: newTask,
        deadline_date: formattedDeadlineDate,
        deadline_time: formattedDeadlineTime,
        priority_id: parseInt(newPriority),
        category_id: newCategory !== "" ? parseInt(newCategory) : null,
        parent_task_id: null,
        is_completed: 0,
        completion_date: null,
      };
  
      console.log("Datos de la tarea a enviar:", task);
  
      try {
        await axios.post('http://localhost:5001/api/tasks', task);
        console.log("Tarea agregada correctamente");
        await fetchTasks(); // Refrescar las tareas
        resetForm();
  
      } catch (error) {
        console.error("Error al agregar tarea:", error.response ? error.response.data : error.message);
      }
    }
  };

  const deleteTask = async (id) => {
    try {
      await axios.delete(`http://localhost:5001/api/tasks/${id}`);
      console.log("Tarea eliminada correctamente");
      // Refrescar el estado de las tareas
      await fetchTasks();
      // Mostrar una notificación de éxito al usuario
  
    } catch (error) {
      console.error("Error al eliminar tarea:", error.response ? error.response.data : error.message);
    }
  };


    const toggleCompletedTask = async (task, isSubtask = false) => {
    const newCompletedStatus = task.is_completed === 1 ? 0 : 1;
  
    try {
      const updatedData = {
        is_completed: newCompletedStatus,
      };
  
      if (newCompletedStatus === 1) {
        updatedData.completion_date = new Date();
      } else {
        updatedData.completion_date = null;
      }
  
      await axios.put(`http://localhost:5001/api/tasks/${task.task_id}`, updatedData);
  
      // Actualizar subtareas si es una tarea principal y se marca como completada
      if (!isSubtask && newCompletedStatus === 1 && task.subtasks && task.subtasks.length > 0) {
        const subtaskPromises = task.subtasks.map(subtask => {
          return axios.put(`http://localhost:5001/api/tasks/${subtask.task_id}`, {
            is_completed: newCompletedStatus,
            completion_date: new Date(),
          });
        });
        await Promise.all(subtaskPromises);
      }
  
      await fetchTasks();
  
    } catch (error) {
      console.error("Error al actualizar la tarea:", error.response ? error.response.data : error.message);
    }
  };

  const startEditing = (task) => {
    setEditingTask(task);
    setNewTask(task.title);
    setNewCategory(task.category_id);
  
    let parsedDeadlineDate = undefined;
    if (task.deadline_date) {
      // Intentar parsear la fecha
      const parsedDate = new Date(task.deadline_date);
      if (!isNaN(parsedDate)) {
        parsedDeadlineDate = parsedDate;
      } else {
        console.warn(`Fecha de deadline inválida para la tarea ID ${task.task_id}:`, task.deadline_date);
      }
    }
    setNewDeadlineDate(parsedDeadlineDate);
  
    // Manejar deadline_time
    const deadlineTimeString = task.deadline_time && task.deadline_time.length >= 5
      ? task.deadline_time.slice(0, 5)
      : "";
    setNewDeadlineTime(deadlineTimeString);
  
    setNewPriority(task.priority_id);
  };

  const saveEdit = async () => {
    if (validateForm() && editingTask) {
      const formattedDeadlineDate = newDeadlineDate
        ? format(newDeadlineDate, 'yyyy-MM-dd')
        : null;
      const formattedDeadlineTime = newDeadlineTime
        ? newDeadlineTime.length === 5
          ? `${newDeadlineTime}:00`
          : newDeadlineTime
        : null;
  
      const updatedTask = {
        title: newTask,
        deadline_date: formattedDeadlineDate,
        deadline_time: formattedDeadlineTime,
        priority_id: newPriority !== "" ? parseInt(newPriority) : null,
        category_id: newCategory !== "" ? parseInt(newCategory) : null,
        parent_task_id: editingTask.parent_task_id,
        is_completed: editingTask.is_completed,
        completion_date: editingTask.completion_date,
      };
  
      console.log("Datos de la tarea actualizada a enviar:", updatedTask);
  
      try {
        await axios.put(`http://localhost:5001/api/tasks/${editingTask.task_id}`, updatedTask);
        console.log("Tarea actualizada correctamente");
        await fetchTasks(); // Refrescar las tareas
        resetForm();
  
      } catch (error) {
        console.error("Error al guardar la edición:", error.response ? error.response.data : error.message);
      }
    }
  };

  const addCustomCategory = async () => {
    if (newCustomCategory.trim() !== "") {
      try {
        const response = await axios.post('http://localhost:5001/api/categories', { name: newCustomCategory });
        console.log("Categoría agregada:", response.data); // Log de depuración
        setCategories(prevCategories => [...prevCategories, response.data]);
        setNewCategory(response.data.category_id);
        setNewCustomCategory("");
        // Mostrar una notificación de éxito al usuario

      } catch (error) {
        console.error("Error al agregar categoría:", error.response ? error.response.data : error.message);
        // Mostrar una notificación de error al usuario

      }
    } else {

    }
  };

  const deleteCategory = async (id) => {
    try {
      await axios.delete(`http://localhost:5001/api/categories/${id}`);
      setCategories(prevCategories => prevCategories.filter((category) => category.category_id !== id));
      // Refrescar las tareas para actualizar las categorías
      await fetchTasks();
      // Mostrar una notificación de éxito al usuario
  
    } catch (error) {
      console.error("Error al eliminar categoría:", error.response ? error.response.data : error.message);
      // Mostrar una notificación de error al usuario
  
    }
  };

  const resetForm = () => {
    setEditingTask(null);
    setNewTask("");
    setNewCategory(""); // Correcto
    setNewDeadlineDate(undefined);
    setNewDeadlineTime("");
    setNewPriority(""); // Correcto
    setErrors({});
  };

  const toggleExpandTask = (id) => {
    setExpandedTasks(prev => prev.includes(id)
      ? prev.filter((taskId) => taskId !== id)
      : [...prev, id]);
  };


// Función para Añadir Subtarea
const addSubtask = async (taskId) => {
  const subtaskDescription = newSubtasks[taskId]?.trim();
  if (subtaskDescription) {
    try {
      // Encontrar la tarea padre en el estado local
      const parentTask = tasks.find(task => task.task_id === taskId);
      if (!parentTask) {
        console.error(`Tarea padre con ID ${taskId} no encontrada.`);
        return;
      }

      // Asegurar que la tarea padre tiene los campos necesarios
      if (
        !parentTask.category_id ||
        !parentTask.priority_id ||
        !parentTask.deadline_date ||
        !parentTask.deadline_time
      ) {
        console.error("La tarea padre no tiene todos los campos necesarios para heredar.");
        return;
      }

      // Crear la subtarea heredando los campos del padre
      const subtask = {
        title: subtaskDescription,
        deadline_date: parentTask.deadline_date, // Hereda la fecha límite
        deadline_time: parentTask.deadline_time, // Hereda la hora límite
        priority_id: parentTask.priority_id,     // Hereda la prioridad
        category_id: parentTask.category_id,     // Hereda la categoría
        parent_task_id: taskId,
        is_completed: 0,
        completion_date: null,
      };

      console.log("Enviando subtarea al backend:", subtask); // Log de depuración

      // Enviar la subtarea al backend
      const response = await axios.post('http://localhost:5001/api/tasks', subtask);
      console.log("Subtarea añadida al backend:", response.data); // Log de depuración

      // Actualizar el estado local con la nueva subtarea
      setTasks(prevTasks => prevTasks.map((task) =>
        task.task_id === taskId
          ? {
              ...task,
              subtasks: [
                ...(task.subtasks || []),
                response.data // Añadir la subtarea retornada por el backend
              ],
            }
          : task
      ));

      // Limpiar el campo de entrada de subtareas
      setNewSubtasks(prev => ({ ...prev, [taskId]: "" }));
      // Mostrar una notificación de éxito al usuario

    } catch (error) {
      console.error("Error al añadir subtarea:", error.response ? error.response.data : error.message);
      // Mostrar una notificación de error al usuario
    }
  } else {
    // Puedes agregar una notificación o manejar el caso donde la descripción está vacía
  }
};

    const toggleSubtaskStatus = async (taskId, subtaskId) => {
    const task = tasks.find(t => t.task_id === taskId);
    if (!task) {
      return;
    }
  
    const subtask = task.subtasks.find(s => s.task_id === subtaskId);
    if (!subtask) {
      return;
    }
  
    const newCompletedStatus = subtask.is_completed === 1 ? 0 : 1;
  
    // Formatear deadline_date a 'YYYY-MM-DD' si está en formato ISO
    let formattedDeadlineDate = subtask.deadline_date;
    if (typeof subtask.deadline_date === 'string' && subtask.deadline_date.includes('T')) {
      formattedDeadlineDate = subtask.deadline_date.split('T')[0];
    }
  
    // Asegurar que deadline_time tenga formato "HH:mm:ss"
    const formattedDeadlineTime = subtask.deadline_time.length === 5 ? `${subtask.deadline_time}:00` : subtask.deadline_time;
  
    const updatedSubtask = {
      title: subtask.title,
      deadline_date: formattedDeadlineDate,
      deadline_time: formattedDeadlineTime,
      priority_id: subtask.priority_id,
      category_id: subtask.category_id,
      parent_task_id: subtask.parent_task_id,
      is_completed: newCompletedStatus, // 1 o 0
      completion_date: newCompletedStatus ? new Date().toISOString() : null,
    };
  
    console.log("Updating subtask:", updatedSubtask); // Log de depuración
    try {
      await axios.put(`http://localhost:5001/api/tasks/${subtask.task_id}`, updatedSubtask);
      console.log("Subtask updated successfully.");
      // Refrescar el estado de las tareas
      await fetchTasks();
      // Mostrar una alerta de éxito al usuario
  
    } catch (error) {
      console.error("Error updating subtask status:", error.response ? error.response.data : error.message);
      // Mostrar una alerta de error al usuario
  
    }
  };

  const deleteSubtask = async (taskId, subtaskId) => {
    try {
      await axios.delete(`http://localhost:5001/api/tasks/${subtaskId}`);
      setTasks(prevTasks => prevTasks.map((task) =>
        task.task_id === taskId
          ? { ...task, subtasks: task.subtasks.filter((subtask) => subtask.task_id !== subtaskId) }
          : task
      ));
      // Mostrar una notificación de éxito al usuario
  
    } catch (error) {
      console.error("Error deleting subtask:", error.response ? error.response.data : error.message);
      // Mostrar una notificación de error al usuario
  
    }
  };

  const getTaskProgress = (task) => {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    const completedSubtasks = task.subtasks.filter(subtask => subtask.is_completed === 1).length;
    return Math.round((completedSubtasks / task.subtasks.length) * 100);
  };

  const generateReport = () => {
    if (!startDate || !endDate) return "Please select both start and end dates.";
  
    // Asegurar que startDate es anterior a endDate
    if (startDate > endDate) return "The start date cannot be later than the end date.";
  
    // Filtrar tareas principales completadas dentro del rango de fechas
    const completedTasks = tasks.filter(task =>
      task.is_completed === 1 &&
      !task.parent_task_id && // Excluir subtareas
      new Date(task.completion_date) >= startDate &&
      new Date(task.completion_date) <= endDate
    );
  
    const totalCompletedTasks = completedTasks.length;
  
    // Calcular tareas activas principales (incompletas)
    const activeTasks = tasks.filter(task =>
      task.is_completed === 0 &&
      !task.parent_task_id // Excluir subtareas
    );
  
    const totalActiveTasks = activeTasks.length;
  
    const completionRate = (totalCompletedTasks + totalActiveTasks) > 0
      ? ((totalCompletedTasks / (totalCompletedTasks + totalActiveTasks)) * 100).toFixed(2)
      : 0;
  
    const categoryCounts = completedTasks.reduce((acc, task) => {
      const categoryName = task.category || 'Sin categoría';
      acc[categoryName] = (acc[categoryName] || 0) + 1;
      return acc;
    }, {});
  
    const priorityCounts = completedTasks.reduce((acc, task) => {
      const priorityName = task.priority || 'Sin prioridad';
      acc[priorityName] = (acc[priorityName] || 0) + 1;
      return acc;
    }, {});
  
    // Construir el informe línea por línea
    const reportLines = [];
  
    // Línea del título del informe
    reportLines.push(`Report from ${format(startDate, 'dd/MM/yyyy')} to ${format(endDate, 'dd/MM/yyyy')}:`);
    reportLines.push(''); // Línea en blanco
  
    // Líneas de estadísticas generales
    reportLines.push(`      Total completed tasks: ${totalCompletedTasks}`);
    reportLines.push(`      Completion rate: ${completionRate}%`);
    reportLines.push(''); // Línea en blanco
  
    // Líneas de tareas por categoría
    reportLines.push('      Tasks by category:');
    if (Object.keys(categoryCounts).length > 0) {
      Object.entries(categoryCounts).forEach(([category, count]) => {
        reportLines.push(`      ${category}: ${count}`);
      });
    } else {
      reportLines.push('      No tasks completed in this period.');
    }
    reportLines.push(''); // Línea en blanco
  
    // Líneas de tareas por prioridad
    reportLines.push('      Tasks by priority:');
    if (Object.keys(priorityCounts).length > 0) {
      Object.entries(priorityCounts).forEach(([priority, count]) => {
        reportLines.push(`      ${priority}: ${count}`);
      });
    } else {
      reportLines.push('      No tasks completed in this period.');
    }
  
    // Unir todas las líneas con saltos de línea
    return reportLines.join('\n');
  };

  // Filtrar Tareas Activas
  const filteredActiveTasks = tasks
    .filter(task => task.title) // Filtrar tareas que tengan un título
    .filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchText.toLowerCase());
      const matchesCategory = filterCategory === "all" || String(task.category_id) === filterCategory;
      const matchesPriority = filterPriority === "all" || String(task.priority_id) === filterPriority;
      const matchesCompletion = task.is_completed === 0; // Tareas activas
      return matchesSearch && matchesCategory && matchesPriority && matchesCompletion;
    });

  // Filtrar Tareas Completadas
  const filteredCompletedTasks = tasks
    .filter(task => task.title) // Filtrar tareas que tengan un título
    .filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchText.toLowerCase());
      const matchesCategory = filterCategory === "all" || String(task.category_id) === filterCategory;
      const matchesPriority = filterPriority === "all" || String(task.priority_id) === filterPriority;
      const matchesCompletion = task.is_completed === 1; // Tareas completadas
      return matchesSearch && matchesCategory && matchesPriority && matchesCompletion;
    });

  return (
    <div className={`container mx-auto p-4 max-w-2xl ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Task Manager</h1>
        <div className="flex items-center space-x-2">
          <Sun className="h-4 w-4" />
          <Switch checked={isDarkMode} onCheckedChange={setIsDarkMode} />
          <Moon className="h-4 w-4" />
        </div>
      </div>  

      {/* Formulario para Añadir/Editar Tareas */}
      <div className="space-y-4 mb-8">
        <Input
          type="text"
          placeholder="New task"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)} />
        {errors.task && <Alert variant="destructive"><AlertDescription>{errors.task}</AlertDescription></Alert>}
        
        {/* Selección de Categoría y Añadir Nueva Categoría */}
        <div className="flex space-x-2">
          <Select value={newCategory} onValueChange={setNewCategory}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.category_id} value={category.category_id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Add new category">
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="New category"
                  value={newCustomCategory}
                  onChange={(e) => setNewCustomCategory(e.target.value)} />
                <Button onClick={addCustomCategory}>Add</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {errors.category && <Alert variant="destructive"><AlertDescription>{errors.category}</AlertDescription></Alert>}
        
        {/* Selección de Fecha y Hora de Deadline */}
        <div className="flex space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={`w-[280px] justify-start text-left font-normal ${
                  !newDeadlineDate ? "text-muted-foreground" : ""
                }`}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {newDeadlineDate ? format(newDeadlineDate, "PPP") : <span>Select a deadline date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800 z-50">
              <Calendar
                mode="single"
                selected={newDeadlineDate}
                onSelect={(date) => {
                  console.log("Fecha de deadline seleccionada:", date);
                  setNewDeadlineDate(date);
                }}
                initialFocus />
            </PopoverContent>
          </Popover>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <Input
              type="time"
              value={newDeadlineTime}
              onChange={(e) => setNewDeadlineTime(e.target.value)}
              className="w-[120px]" />
          </div>
        </div>
        {errors.date && <Alert variant="destructive"><AlertDescription>{errors.date}</AlertDescription></Alert>}
        {errors.time && <Alert variant="destructive"><AlertDescription>{errors.time}</AlertDescription></Alert>}
        
        {/* Selección de Prioridad */}
        <Select value={newPriority} onValueChange={setNewPriority}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            {priorities.map((priority) => (
              <SelectItem key={priority.priority_id} value={priority.priority_id}>
                {priority.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.priority && <Alert variant="destructive"><AlertDescription>{errors.priority}</AlertDescription></Alert>}
        
        {/* Botón para Añadir o Guardar Edición de Tarea */}
        <Button onClick={editingTask ? saveEdit : addTask} className="w-full">
          {editingTask ? "Save Edit" : "Add Task"}
        </Button>
      </div>

      {/* Filtros de Búsqueda y Filtrado */}
      <div className="space-y-4 mb-8">
        <Input
          type="text"
          placeholder="Search tasks"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)} />
        <div className="flex space-x-2">
        <Select
  value={filterCategory}
  onValueChange={(value) => setFilterCategory(value)}>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Filter by category" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All categories</SelectItem>
    {categories.map((category) => (
      <SelectItem key={category.category_id} value={String(category.category_id)}>
        {category.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
<Select
  value={filterPriority}
  onValueChange={(value) => setFilterPriority(value)}>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Filter by priority" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All priorities</SelectItem>
    {priorities.map((priority) => (
      <SelectItem key={priority.priority_id} value={String(priority.priority_id)}>
        {priority.name}
      </SelectItem>
    ))}
  </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-completed"
            checked={showCompleted}
            onCheckedChange={(checked) => setShowCompleted(checked)} />
          <Label htmlFor="show-completed">Completed Tasks</Label>
        </div>
      </div>

      {/* Lista de Categorías */}
      <div className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold">Categories</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <div
              key={category.category_id}
              className="flex items-center space-x-2 bg-secondary text-secondary-foreground rounded-full px-3 py-1">
              <span>{category.name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-4 w-4 rounded-full"
                onClick={() => deleteCategory(category.category_id)}
                aria-label={`Delete category ${category.name}`}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Renderización Condicional de Tareas */}
      <div className="space-y-4">
        {showCompleted ? (
          // Mostrar solo tareas completadas
          <div>
            <h2 className="text-xl font-semibold mb-4">Completed Tasks</h2>
            {filteredCompletedTasks.length > 0 ? (
              filteredCompletedTasks.map((task) => {
                // Formatear la fecha de completion_date
                const hasValidCompletionDate = task.completion_date;
                let formattedCompletionDate = "No completion date set";
                if (hasValidCompletionDate) {
                  const completionDate = new Date(task.completion_date);
                  if (!isNaN(completionDate)) {
                    formattedCompletionDate = format(completionDate, "dd/MM/yyyy HH:mm");
                  } else {
                    console.warn(`Invalid completion date for task ID ${task.task_id}:`, task.completion_date);
                  }
                }

                return (
                  <div key={task.task_id} className="bg-card text-card-foreground rounded-lg shadow">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-4">
                        <Checkbox
                          checked={task.is_completed === 1}
                          onCheckedChange={() => toggleCompletedTask(task, false)} // Indicando que no es una subtarea
                        />
                        <div>
                          <p className="line-through text-gray-500">{task.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {task.category} - Completed on: {formattedCompletionDate} - Priority: {task.priority}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="icon" variant="outline" onClick={() => toggleExpandTask(task.task_id)}>
                          {expandedTasks.includes(task.task_id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        {task.is_completed === 0 && (
  <Button size="icon" variant="outline" onClick={() => startEditing(task)}>
    <Pencil className="h-4 w-4" />
  </Button>
)}
<Button
  size="icon"
  variant="outline"
  onClick={() => deleteTask(task.task_id)}
  disabled={editingTask?.task_id === task.task_id} // Condición añadida
  aria-label={`Delete task ${task.title}`}>
  <Trash2 className="h-4 w-4" />
</Button>
                      </div>
                    </div>
                    {expandedTasks.includes(task.task_id) && (
                      <div className="p-4 border-t border-border">
                        {/* Subtareas */}
                        <h3 className="font-semibold mb-2">Subtasks</h3>
                        <Progress value={getTaskProgress(task)} className="mb-2" />
                        <div className="space-y-2">
                          {task.subtasks && task.subtasks.length > 0 ? (
                            task.subtasks.map((subtask) => {
                              // Formatear la fecha de completion_date de la subtarea
                              const hasValidSubtaskCompletionDate = subtask.completion_date;
                              let formattedSubtaskCompletionDate = "No completion date set";
                              if (hasValidSubtaskCompletionDate) {
                                const subtaskCompletionDate = new Date(subtask.completion_date);
                                if (!isNaN(subtaskCompletionDate)) {
                                  formattedSubtaskCompletionDate = format(subtaskCompletionDate, "dd/MM/yyyy HH:mm");
                                } else {
                                  console.warn(`Invalid completion date for subtask ID ${subtask.task_id}:`, subtask.completion_date);
                                }
                              }

                              return (
                                <div key={subtask.task_id} className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={subtask.is_completed === 1}
                                      onCheckedChange={() => toggleCompletedTask(subtask, true)} />
                                    <span className={subtask.is_completed === 1 ? "line-through text-gray-500" : ""}>
                                      {subtask.title}
                                    </span>
                                    {subtask.is_completed === 1 && (
                                      <span className="text-xs text-gray-400">({formattedSubtaskCompletionDate})</span>
                                    )}
                                  </div>
                                  {task.is_completed === 0 && (
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => deleteSubtask(task.task_id, subtask.task_id)}
                                    aria-label={`Delete subtask ${subtask.title}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground">No subtasks added.</p>
                          )}
                        </div>
                        {task.is_completed === 0 && (
                        <div className="flex mt-2 space-x-2">
                          <Input
                            type="text"
                            placeholder="New subtask"
                            value={newSubtasks[task.task_id] || ""}
                            onChange={(e) => setNewSubtasks(prev => ({ ...prev, [task.task_id]: e.target.value }))}
                            onKeyDown={(e) => { // Cambiado de onKeyPress a onKeyDown
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addSubtask(task.task_id);
                              }
                            }}
                          />
                          <Button onClick={() => addSubtask(task.task_id)}>Add Subtask</Button>
                        </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground">No completed tasks found.</p>
            )}
          </div>
        ) : (
          // Mostrar solo tareas activas
          <div>
            <h2 className="text-xl font-semibold mb-4">Active Tasks</h2>
            {filteredActiveTasks.length > 0 ? (
              filteredActiveTasks.map((task) => {
                // Formatear la fecha de deadline
                const hasValidDeadline = task.deadline_date && task.deadline_time;
                let formattedDeadline = "No deadline set";
                if (hasValidDeadline) {
                  let datePart = task.deadline_date;
                  if (datePart.includes('T')) {
                    // Extraer solo la parte de la fecha si incluye tiempo
                    datePart = datePart.split('T')[0];
                  }
                  const deadlineDate = parse(`${datePart} ${task.deadline_time}`, 'yyyy-MM-dd HH:mm:ss', new Date());
                  if (isValid(deadlineDate)) {
                    formattedDeadline = format(deadlineDate, "dd/MM/yyyy HH:mm");
                  } else {
                    console.warn(`Fecha inválida para la tarea ID ${task.task_id}:`, `${datePart} ${task.deadline_time}`);
                  }
                }

                return (
                  <div key={task.task_id} className="bg-card text-card-foreground rounded-lg shadow">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-4">
                      <Checkbox
  checked={task.is_completed === 1}
  onCheckedChange={() => toggleCompletedTask(task)} 
  disabled={editingTask?.task_id === task.task_id} // Deshabilitar si está en edición
/>
                        <div>
                          <p className={task.is_completed === 1 ? "line-through" : ""}>{task.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {task.category} - {formattedDeadline} - Priority: {task.priority}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="icon" variant="outline" onClick={() => toggleExpandTask(task.task_id)}>
                          {expandedTasks.includes(task.task_id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <Button size="icon" variant="outline" onClick={() => startEditing(task)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
  size="icon"
  variant="outline"
  onClick={() => deleteTask(task.task_id)}
  disabled={editingTask?.task_id === task.task_id} // Condición añadida
  aria-label={`Delete task ${task.title}`}>
  <Trash2 className="h-4 w-4" />
</Button>
                      </div>
                    </div>
                    {expandedTasks.includes(task.task_id) && (
                      <div className="p-4 border-t border-border">
                        {/* Subtareas */}
                        <h3 className="font-semibold mb-2">Subtasks</h3>
                        <Progress value={getTaskProgress(task)} className="mb-2" />
                        <div className="space-y-2">
                          {task.subtasks && task.subtasks.length > 0 ? (
                            task.subtasks.map((subtask) => {
                              // Formatear la fecha de completion_date de la subtarea
                              const hasValidSubtaskCompletionDate = subtask.completion_date;
                              let formattedSubtaskCompletionDate = "No completion date set";
                              if (hasValidSubtaskCompletionDate) {
                                const subtaskCompletionDate = new Date(subtask.completion_date);
                                if (!isNaN(subtaskCompletionDate)) {
                                  formattedSubtaskCompletionDate = format(subtaskCompletionDate, "dd/MM/yyyy HH:mm");
                                } else {
                                  console.warn(`Invalid completion date for subtask ID ${subtask.task_id}:`, subtask.completion_date);
                                }
                              }

                              return (
                                <div key={subtask.task_id} className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                  <Checkbox
  checked={subtask.is_completed === 1}
  onCheckedChange={() => toggleSubtaskStatus(task.task_id, subtask.task_id)} 
  disabled={editingTask?.task_id === task.task_id} // Deshabilitar si la tarea padre está en edición
/>
                                    <span className={subtask.is_completed === 1 ? "line-through text-gray-500" : ""}>
                                      {subtask.title}
                                    </span>
                                    {subtask.is_completed === 1 && (
                                      <span className="text-xs text-gray-400">({formattedSubtaskCompletionDate})</span>
                                    )}
                                  </div>
                                  <Button
  size="icon"
  variant="outline"
  onClick={() => deleteSubtask(task.task_id, subtask.task_id)}
  aria-label={`Delete subtask ${subtask.title}`}
  disabled={editingTask?.task_id === task.task_id} // Opcional: Deshabilitar eliminar subtarea si la tarea está siendo editada
>
  <Trash2 className="h-4 w-4" />
</Button>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground">No subtasks added.</p>
                          )}
                        </div>
                        <div className="flex mt-2 space-x-2">
                          <Input
                            type="text"
                            placeholder="New subtask"
                            value={newSubtasks[task.task_id] || ""}
                            onChange={(e) => setNewSubtasks(prev => ({ ...prev, [task.task_id]: e.target.value }))}
                            onKeyDown={(e) => { // Cambiado de onKeyPress a onKeyDown
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addSubtask(task.task_id);
                              }
                            }}
                          />
                          <Button onClick={() => addSubtask(task.task_id)}>Add Subtask</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground">No active tasks found.</p>
            )}
          </div>
        )}
      </div>

      {/* Sección de Historial de Tareas */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Task History Report</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full">
              <FileBarChart className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle>Generate Report</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="start-date" className="text-right">
                  Start Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date"
                      variant={"outline"}
                      className={`w-[280px] justify-start text-left font-normal ${
                        !startDate ? "text-muted-foreground" : ""
                      }`}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800 z-50">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        console.log("Fecha de inicio seleccionada:", date);
                        setStartDate(date);
                      }}
                      initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="end-date" className="text-right">
                  End Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date"
                      variant={"outline"}
                      className={`w-[280px] justify-start text-left font-normal ${
                        !endDate ? "text-muted-foreground" : ""
                      }`}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800 z-50">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        console.log("Fecha de fin seleccionada:", date);
                        setEndDate(date);
                      }}
                      initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="mt-4">
              <Label>Report</Label>
              <div className="mt-2 p-4 bg-muted dark:bg-gray-700 rounded-md">
                <pre className="text-sm whitespace-pre-wrap text-black dark:text-white">{generateReport()}</pre>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => {
                  const report = generateReport();
                  // Descargar el reporte como archivo de texto
                  const blob = new Blob([report], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `reporte_${format(new Date(), 'yyyyMMdd')}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}>
                  Download Report
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}