const STORAGE_KEY = 'todo-app-tasks';
const FILTERS = ['all', 'active', 'completed'];

let tasks = [];
let currentFilter = 'all';
let storageAvailable = true;

const taskInput = document.getElementById('task-input');
const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
const taskCount = document.getElementById('task-count');
const activeCount = document.getElementById('active-count');
const completedCount = document.getElementById('completed-count');
const formMessage = document.getElementById('form-message');
const filterGroup = document.getElementById('filter-group');
const themeToggle = document.querySelector('[data-theme-toggle]');

function isStorageAvailable() {
  try {
    const testKey = '__todo_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

function getStoredValue(key, fallbackValue) {
  if (!storageAvailable) return fallbackValue;

  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ?? fallbackValue;
  } catch (error) {
    console.error('Unable to read preference:', error);
    return fallbackValue;
  }
}

function setStoredValue(key, value) {
  if (!storageAvailable) return;

  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error('Unable to write preference:', error);
  }
}

function isValidTask(task) {
  return Boolean(
    task &&
      typeof task === 'object' &&
      typeof task.id === 'string' &&
      typeof task.title === 'string' &&
      typeof task.completed === 'boolean'
  );
}

function normalizeTasks(items) {
  if (!Array.isArray(items)) return [];

  return items.filter(isValidTask).map((task) => ({
    ...task,
    title: task.title.trim(),
  }));
}

function loadTasks() {
  storageAvailable = isStorageAvailable();

  if (!storageAvailable) {
    tasks = [];
    return;
  }

  try {
    const storedTasks = getStoredValue(STORAGE_KEY, '[]');
    tasks = normalizeTasks(JSON.parse(storedTasks));
  } catch (error) {
    console.error('Unable to load tasks:', error);
    tasks = [];
    setStoredValue(STORAGE_KEY, '[]');
  }
}

function saveTasks() {
  if (!storageAvailable) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Unable to save tasks:', error);
    showMessage('Storage is unavailable, so the latest change could not be saved.', true);
  }
}

function getFilteredTasks() {
  if (currentFilter === 'active') {
    return tasks.filter((task) => !task.completed);
  }

  if (currentFilter === 'completed') {
    return tasks.filter((task) => task.completed);
  }

  return tasks;
}

function updateStatistics() {
  taskCount.textContent = tasks.length;
  activeCount.textContent = tasks.filter((task) => !task.completed).length;
  completedCount.textContent = tasks.filter((task) => task.completed).length;
}

function createTaskElement(task) {
  const item = document.createElement('article');
  item.className = `task-item${task.completed ? ' is-complete' : ''}`;
  item.dataset.id = task.id;
  item.setAttribute('role', 'listitem');

  const content = document.createElement('div');
  content.className = 'task-content';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.checked = task.completed;
  checkbox.setAttribute('aria-label', `Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`);

  const title = document.createElement('span');
  title.className = 'task-title';
  title.textContent = task.title;

  content.append(checkbox, title);

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'task-action';
  editButton.dataset.action = 'edit';
  editButton.textContent = 'Edit';
  editButton.setAttribute('aria-label', `Edit task ${task.title}`);

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'task-action delete';
  deleteButton.dataset.action = 'delete';
  deleteButton.textContent = 'Delete';
  deleteButton.setAttribute('aria-label', `Delete task ${task.title}`);

  actions.append(editButton, deleteButton);
  item.append(content, actions);
  return item;
}

function renderTasks() {
  const filteredTasks = getFilteredTasks();
  taskList.replaceChildren();

  if (filteredTasks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'task-empty';
    empty.textContent = tasks.length === 0
      ? 'No tasks yet. Add your first task above.'
      : 'No tasks match this filter.';
    taskList.appendChild(empty);
    updateStatistics();
    return;
  }

  const fragment = document.createDocumentFragment();
  filteredTasks.forEach((task) => fragment.appendChild(createTaskElement(task)));
  taskList.appendChild(fragment);
  updateStatistics();
}

function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.style.color = isError ? 'var(--color-danger)' : 'var(--color-primary)';
}

function commitTaskState(nextTasks, message) {
  tasks = nextTasks;
  saveTasks();
  renderTasks();
  if (message) {
    showMessage(message);
  }
}

function createTask(title) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    showMessage('Please enter a task before adding it.', true);
    return;
  }

  const nextTasks = [{
    id: Date.now().toString(),
    title: trimmedTitle,
    completed: false,
    createdAt: new Date().toISOString(),
  }, ...tasks];

  commitTaskState(nextTasks, 'Task added successfully.');
  taskInput.value = '';
  taskInput.focus();
}

function updateTask(id, newTitle) {
  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle) {
    showMessage('Task title cannot be empty.', true);
    return;
  }

  const nextTasks = tasks.map((task) => (task.id === id ? { ...task, title: trimmedTitle } : task));
  commitTaskState(nextTasks, 'Task updated.');
}

function deleteTask(id) {
  const taskToDelete = tasks.find((task) => task.id === id);
  if (!taskToDelete) return;

  const confirmed = window.confirm(`Delete "${taskToDelete.title}"?`);
  if (!confirmed) return;

  const nextTasks = tasks.filter((task) => task.id !== id);
  commitTaskState(nextTasks, 'Task deleted.');
}

function toggleComplete(id) {
  const nextTasks = tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task));
  commitTaskState(nextTasks);
}

function startEditing(taskId) {
  const item = taskList.querySelector(`[data-id="${taskId}"]`);
  if (!item) return;

  const titleElement = item.querySelector('.task-title');
  const currentTitle = titleElement.textContent;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'edit-input';
  input.value = currentTitle;
  input.setAttribute('aria-label', 'Edit task title');

  const actionGroup = document.createElement('div');
  actionGroup.className = 'edit-actions';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'task-action';
  saveButton.textContent = 'Save';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'task-action';
  cancelButton.textContent = 'Cancel';

  actionGroup.append(saveButton, cancelButton);
  item.replaceChildren();
  item.appendChild(input);
  item.appendChild(actionGroup);
  input.focus();
  input.select();

  const saveEdit = () => {
    updateTask(taskId, input.value);
  };

  const cancelEdit = () => {
    renderTasks();
  };

  saveButton.addEventListener('click', saveEdit);
  cancelButton.addEventListener('click', cancelEdit);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveEdit();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    }
  });
}

function setFilter(filter) {
  currentFilter = FILTERS.includes(filter) ? filter : 'all';
  document.querySelectorAll('.filter-button').forEach((button) => {
    const isActive = button.dataset.filter === currentFilter;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
  renderTasks();
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.setAttribute('data-theme', 'light');
  }

  if (themeToggle) {
    const icon = themeToggle.querySelector('.theme-icon');
    if (icon) {
      icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  }
}

function initTheme() {
  const storedTheme = getStoredValue('portfolio-theme', '');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = storedTheme || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);

  themeToggle?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    setStoredValue('portfolio-theme', nextTheme);
  });
}

function bindEvents() {
  taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    createTask(taskInput.value);
  });

  taskList.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    const item = event.target.closest('.task-item');
    if (!item) return;

    const taskId = item.dataset.id;

    if (button.dataset.action === 'delete') {
      deleteTask(taskId);
    } else if (button.dataset.action === 'edit') {
      startEditing(taskId);
    }
  });

  taskList.addEventListener('change', (event) => {
    if (event.target.classList.contains('task-checkbox')) {
      const item = event.target.closest('.task-item');
      if (!item) return;
      toggleComplete(item.dataset.id);
    }
  });

  filterGroup.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-filter]');
    if (!button) return;
    setFilter(button.dataset.filter);
  });
}

function init() {
  loadTasks();
  bindEvents();
  initTheme();
  setFilter(currentFilter);
}

init();
