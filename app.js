const STORAGE_KEY = 'taskflow-kanban-tasks-v1';
const STATUSES = ['todo', 'inprogress', 'done'];
const STATUS_LABELS = { todo: 'To do', inprogress: 'In progress', done: 'Done' };
const PRIORITY_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };
let toastTimeout;

const starterTasks = [
  { id: 'task-1', title: 'Finalize homepage wireframes', description: 'Review the last round of feedback and lock in the layout.', status: 'todo', priority: 'high', assignee: 'Alex', dueDate: dateOffset(2), label: 'Design' },
  { id: 'task-2', title: 'Set up analytics events', description: 'Track sign-ups, onboarding completion, and key CTA clicks.', status: 'todo', priority: 'medium', assignee: 'Sam', dueDate: dateOffset(5), label: 'Engineering' },
  { id: 'task-3', title: 'Write launch email sequence', description: 'Draft the announcement and two follow-up emails.', status: 'todo', priority: 'low', assignee: 'Jordan', dueDate: '', label: 'Marketing' },
  { id: 'task-4', title: 'Build pricing page', description: 'Bring the new pricing tiers and FAQs into the product site.', status: 'inprogress', priority: 'high', assignee: 'Jordan', dueDate: dateOffset(1), label: 'Engineering' },
  { id: 'task-5', title: 'Collect customer testimonials', description: '', status: 'inprogress', priority: 'medium', assignee: 'Alex', dueDate: dateOffset(3), label: 'Marketing' },
  { id: 'task-6', title: 'Kickoff with the launch team', description: 'Align on the timeline, owners, and how we will measure success.', status: 'done', priority: 'low', assignee: 'Sam', dueDate: dateOffset(-1), label: 'Planning' },
];

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return starterTasks;
    const tasks = JSON.parse(stored);
    if (!Array.isArray(tasks)) throw new Error('Saved tasks must be a list.');
    return tasks.filter((task) => (
      task && typeof task.id === 'string'
      && typeof task.title === 'string'
      && STATUSES.includes(task.status)
      && Object.hasOwn(PRIORITY_LABELS, task.priority)
    ));
  } catch (error) {
    console.error('Could not load saved tasks.', error);
    showToast('Saved tasks could not be loaded. Changes may not persist.');
    return starterTasks;
  }
}

let tasks = loadTasks();
let draggedTaskId = null;

const board = document.querySelector('#board-columns');
const dialog = document.querySelector('#task-dialog');
const form = document.querySelector('#task-form');
const searchInput = document.querySelector('#search-input');
const priorityFilter = document.querySelector('#priority-filter');
const deleteButton = document.querySelector('#delete-task-button');
const boardSummary = document.querySelector('#board-summary');

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Could not save tasks.', error);
    showToast('Could not save changes in this browser.');
  }
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

function isOverdue(dateString) {
  return Boolean(dateString) && dateString < dateOffset(0);
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

function renderTask(task) {
  const due = formatDate(task.dueDate);
  const dueClass = task.status === 'done' ? 'completed' : (isOverdue(task.dueDate) ? 'overdue' : '');
  const dueLabel = task.status === 'done' ? 'Completed' : (isOverdue(task.dueDate) ? 'Overdue' : 'Due');
  const description = task.description ? `<p class="task-description">${escapeText(task.description)}</p>` : '';
  const dueMarkup = due ? `<span class="task-due ${dueClass}"><span aria-hidden="true">◷</span>${dueLabel} ${due}</span>` : '<span></span>';
  const assignee = task.assignee ? `<span class="task-assignee"><span class="assignee-avatar">${escapeText(initials(task.assignee))}</span>${escapeText(task.assignee)}</span>` : '';
  const label = task.label ? `<span class="tag tag-label">${escapeText(task.label)}</span>` : '';

  return `<article class="task-card" draggable="true" data-task-id="${escapeText(task.id)}" aria-label="${escapeText(task.title)}; ${STATUS_LABELS[task.status]}">
    <div class="task-card-top"><h3 class="task-title">${escapeText(task.title)}</h3><button class="card-menu" type="button" data-edit-task="${escapeText(task.id)}" aria-label="Edit ${escapeText(task.title)}">···</button></div>
    ${description}
    <div class="task-tags"><span class="tag priority-${task.priority}">${PRIORITY_LABELS[task.priority]} priority</span>${label}</div>
    <div class="task-meta">${dueMarkup}${assignee}</div>
  </article>`;
}

function renderBoard() {
  const query = searchInput.value.trim().toLowerCase();
  const priority = priorityFilter.value;
  const visibleTasks = tasks.filter((task) => {
    const matchesQuery = !query || `${task.title} ${task.description || ''} ${task.assignee || ''} ${task.label || ''}`.toLowerCase().includes(query);
    return matchesQuery && (priority === 'all' || task.priority === priority);
  });

  for (const status of STATUSES) {
    const statusTasks = visibleTasks.filter((task) => task.status === status);
    board.querySelector(`[data-list="${status}"]`).innerHTML = statusTasks.map(renderTask).join('');
    board.querySelector(`[data-count="${status}"]`).textContent = statusTasks.length;
  }

  const complete = tasks.filter((task) => task.status === 'done').length;
  boardSummary.textContent = tasks.length
    ? `${complete} of ${tasks.length} tasks complete. Keep the momentum going!`
    : 'Your board is clear. Add a task to get started.';
}

function openTaskDialog(task = null, status = 'todo') {
  form.reset();
  document.querySelector('#task-id').value = task?.id || '';
  document.querySelector('#task-title').value = task?.title || '';
  document.querySelector('#task-description').value = task?.description || '';
  document.querySelector('#task-status').value = task?.status || status;
  document.querySelector('#task-priority').value = task?.priority || 'medium';
  document.querySelector('#task-assignee').value = task?.assignee || '';
  document.querySelector('#task-due').value = task?.dueDate || '';
  document.querySelector('#dialog-title').textContent = task ? 'Edit task' : 'Create a task';
  form.querySelector('.save-button').textContent = task ? 'Save changes' : 'Create task';
  deleteButton.hidden = !task;
  dialog.showModal();
  document.querySelector('#task-title').focus();
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 2600);
}

document.querySelector('#new-task-button').addEventListener('click', () => openTaskDialog());
document.querySelectorAll('[data-add-status]').forEach((button) => {
  button.addEventListener('click', () => openTaskDialog(null, button.dataset.addStatus));
});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('.cancel-button').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const titleInput = document.querySelector('#task-title');
  if (!titleInput.value.trim()) titleInput.value = '';
  if (!form.reportValidity()) return;

  const id = document.querySelector('#task-id').value;
  const existing = tasks.find((task) => task.id === id);
  const task = {
    id: id || (globalThis.crypto?.randomUUID?.() ?? `task-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    title: titleInput.value.trim(),
    description: document.querySelector('#task-description').value.trim(),
    status: document.querySelector('#task-status').value,
    priority: document.querySelector('#task-priority').value,
    assignee: document.querySelector('#task-assignee').value.trim(),
    dueDate: document.querySelector('#task-due').value,
    label: existing?.label || '',
  };

  if (existing) {
    tasks = tasks.map((item) => item.id === id ? task : item);
  } else {
    tasks.unshift(task);
  }
  saveTasks();
  renderBoard();
  dialog.close();
  showToast(existing ? 'Task updated.' : 'Task created.');
});

deleteButton.addEventListener('click', () => {
  const id = document.querySelector('#task-id').value;
  const task = tasks.find((item) => item.id === id);
  if (!task || !window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
  tasks = tasks.filter((item) => item.id !== id);
  saveTasks();
  renderBoard();
  dialog.close();
  showToast('Task deleted.');
});

board.addEventListener('click', (event) => {
  const editButton = event.target.closest('[data-edit-task]');
  if (!editButton) return;
  const task = tasks.find((item) => item.id === editButton.dataset.editTask);
  if (task) openTaskDialog(task);
});

searchInput.addEventListener('input', renderBoard);
priorityFilter.addEventListener('change', renderBoard);

board.addEventListener('dragstart', (event) => {
  const card = event.target.closest('.task-card');
  if (!card) return;
  draggedTaskId = card.dataset.taskId;
  card.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', draggedTaskId);
});

board.addEventListener('dragend', (event) => {
  event.target.closest('.task-card')?.classList.remove('dragging');
  board.querySelectorAll('.drag-over').forEach((column) => column.classList.remove('drag-over'));
});

board.querySelectorAll('.board-column').forEach((column) => {
  column.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    column.classList.add('drag-over');
  });
  column.addEventListener('dragleave', (event) => {
    if (!column.contains(event.relatedTarget)) column.classList.remove('drag-over');
  });
  column.addEventListener('drop', (event) => {
    event.preventDefault();
    column.classList.remove('drag-over');
    const id = event.dataTransfer.getData('text/plain') || draggedTaskId;
    const status = column.dataset.status;
    const task = tasks.find((item) => item.id === id);
    if (!task || task.status === status) return;
    task.status = status;
    saveTasks();
    renderBoard();
    showToast(`Moved to ${STATUS_LABELS[status]}.`);
  });
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
  }
});

renderBoard();
