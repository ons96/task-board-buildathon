import {
  EVIDENCE_KIND_LABELS,
  STATUS_LABELS,
  STATUSES,
  TASK_TYPE_LABELS,
  addEvidence,
  createId,
  createTask,
  getDoneGate,
  taskProgress,
  transitionTask,
} from '/src/task-model.mjs';
import { planTask } from '/src/task-planner.mjs';
import { createSampleTasks } from '/src/sample-data.mjs';
import { loadState, saveState } from '/src/storage.mjs';

const state = loadState();
const board = document.querySelector('#board');
const taskCount = document.querySelector('#task-count');
const demoStatus = document.querySelector('#demo-status');
const sourceInput = document.querySelector('#source-input');
const plannerForm = document.querySelector('#planner-form');
const dialog = document.querySelector('#task-dialog');
const taskForm = document.querySelector('#task-form');
const toast = document.querySelector('#toast');
let draggedTaskId = null;
let toastTimer = null;

const byId = (id) => document.querySelector(`#${id}`);
const now = () => new Date().toISOString();

function persist() {
  try {
    saveState(state);
  } catch (error) {
    showToast(`Could not save this change: ${error.message}`, true);
  }
}

function taskById(id) {
  return state.tasks.find((task) => task.id === id);
}

function touch(task) {
  task.updatedAt = now();
  state.demoMode = false;
  persist();
}

function replaceTask(updatedTask) {
  const index = state.tasks.findIndex((task) => task.id === updatedTask.id);
  if (index === -1) return;
  state.tasks[index] = updatedTask;
  state.demoMode = false;
  persist();
}

function textElement(tagName, className, value) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = value;
  return element;
}

function showToast(message, isError = false) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle('is-error', isError);
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 4200);
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function updateBoardMeta() {
  const count = state.tasks.length;
  taskCount.textContent = `${count} ${count === 1 ? 'task' : 'tasks'}`;
  demoStatus.textContent = state.demoMode
    ? 'Demo data is ready to explore'
    : `${count === 0 ? 'Start with a messy issue above' : 'Local changes save automatically'}`;
}

function createTaskCard(task) {
  const card = textElement('article', 'task-card');
  card.draggable = true;
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `Open task: ${task.title}`);
  card.dataset.taskId = task.id;

  const topLine = textElement('div', 'task-card-meta');
  topLine.append(textElement('span', `type-pill type-${task.type}`, TASK_TYPE_LABELS[task.type] || task.type));
  topLine.append(textElement('span', '', formatDate(task.updatedAt)));
  card.append(topLine);

  card.append(textElement('h3', '', task.title || 'Untitled task'));
  card.append(textElement('p', 'task-card-summary', task.summary || 'No summary yet.'));

  const progress = taskProgress(task);
  const progressLine = textElement('div', 'card-progress');
  const track = textElement('span', 'progress-track');
  const fill = textElement('span', 'progress-fill');
  const percent = progress.criteria.total === 0
    ? 0
    : Math.round((progress.criteria.complete / progress.criteria.total) * 100);
  fill.style.width = `${percent}%`;
  track.append(fill);
  progressLine.append(track);
  progressLine.append(textElement('small', '', `${progress.criteria.complete}/${progress.criteria.total} criteria`));
  card.append(progressLine);

  const bottomLine = textElement('div', 'task-card-meta');
  bottomLine.append(textElement('span', '', `${progress.evidence} evidence`));
  bottomLine.append(textElement('span', '', `${progress.subtasks.complete}/${progress.subtasks.total} subtasks`));
  card.append(bottomLine);

  const statusSelect = document.createElement('select');
  statusSelect.className = 'card-status';
  statusSelect.setAttribute('aria-label', `Move ${task.title}`);
  for (const status of STATUSES) {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = STATUS_LABELS[status];
    option.selected = status === task.status;
    statusSelect.append(option);
  }
  statusSelect.addEventListener('click', (event) => event.stopPropagation());
  statusSelect.addEventListener('change', (event) => {
    event.stopPropagation();
    attemptMove(task.id, event.target.value);
  });
  card.append(statusSelect);

  card.addEventListener('click', (event) => {
    if (event.target.closest('select, button')) return;
    openTask(task.id);
  });
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openTask(task.id);
    }
  });
  card.addEventListener('dragstart', (event) => {
    draggedTaskId = task.id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.id);
    card.classList.add('is-dragging');
  });
  card.addEventListener('dragend', () => {
    draggedTaskId = null;
    card.classList.remove('is-dragging');
  });

  return card;
}

function renderBoard() {
  board.replaceChildren();
  updateBoardMeta();

  if (state.tasks.length === 0) {
    const empty = textElement('div', 'empty-board');
    empty.append(textElement('strong', '', 'Your board is clear.'));
    empty.append(textElement('span', '', 'Paste a messy issue above or create a blank task to begin.'));
    board.append(empty);
    return;
  }

  STATUSES.forEach((status, index) => {
    const column = textElement('section', 'board-column');
    column.dataset.status = status;
    column.setAttribute('aria-label', `${STATUS_LABELS[status]} tasks`);
    const tasks = state.tasks.filter((task) => task.status === status);

    const header = textElement('div', 'column-header');
    const title = textElement('div', 'column-title');
    title.append(textElement('span', 'column-index', `0${index + 1}`));
    title.append(textElement('span', '', STATUS_LABELS[status]));
    header.append(title);
    header.append(textElement('span', 'column-count', String(tasks.length)));
    column.append(header);

    if (tasks.length === 0) {
      column.append(textElement('p', 'column-hint', status === 'done' ? 'Verified work lands here.' : 'Drop a task here.'));
    } else {
      tasks.forEach((task) => column.append(createTaskCard(task)));
    }

    column.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      column.classList.add('is-over');
    });
    column.addEventListener('dragleave', () => column.classList.remove('is-over'));
    column.addEventListener('drop', (event) => {
      event.preventDefault();
      column.classList.remove('is-over');
      const taskId = event.dataTransfer.getData('text/plain') || draggedTaskId;
      if (taskId) attemptMove(taskId, status);
    });
    board.append(column);
  });
}

function renderGate(task) {
  const banner = byId('gate-banner');
  const gate = getDoneGate(task);
  banner.replaceChildren();
  banner.className = `gate-banner${gate.allowed ? ' is-ready' : ''}`;
  const title = textElement('span', 'gate-title', gate.allowed ? 'Done gate ready' : 'Done gate is active');
  banner.append(title);

  if (gate.allowed) {
    banner.append(textElement('span', '', 'Every criterion is verified and evidence is attached. This task can move to Done.'));
    return;
  }

  banner.append(textElement('span', '', 'Finish these checks before moving the task to Done:'));
  const reasons = document.createElement('ul');
  reasons.className = 'gate-list';
  gate.reasons.forEach((reason) => reasons.append(textElement('li', '', reason)));
  banner.append(reasons);
}

function renderEditableList(container, items, options) {
  container.replaceChildren();
  if (items.length === 0) {
    container.append(textElement('span', 'plain-list-row', options.emptyText));
    return;
  }

  items.forEach((item) => {
    const row = textElement('div', 'editable-row');
    if (options.checkbox) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item[options.checkedField] === true;
      checkbox.dataset.action = options.toggleAction;
      checkbox.dataset.itemId = item.id;
      checkbox.setAttribute('aria-label', `Verify ${item.text}`);
      row.append(checkbox);
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.value = item.text;
    input.dataset.action = options.editAction;
    input.dataset.itemId = item.id;
    input.setAttribute('aria-label', options.ariaLabel);
    row.append(input);

    const remove = textElement('button', 'remove-button', 'x');
    remove.type = 'button';
    remove.dataset.action = options.removeAction;
    remove.dataset.itemId = item.id;
    remove.setAttribute('aria-label', `Remove ${options.ariaLabel.toLowerCase()}`);
    row.append(remove);
    container.append(row);
  });
}

function renderStringList(container, items, options) {
  container.replaceChildren();
  if (items.length === 0) {
    container.append(textElement('span', 'plain-list-row', options.emptyText));
    return;
  }

  items.forEach((value, index) => {
    const row = textElement('div', 'plain-list-row');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.dataset.action = options.editAction;
    input.dataset.index = String(index);
    input.setAttribute('aria-label', options.ariaLabel);
    row.replaceChildren(input);
    const remove = textElement('button', 'remove-button', 'x');
    remove.type = 'button';
    remove.dataset.action = options.removeAction;
    remove.dataset.index = String(index);
    remove.setAttribute('aria-label', `Remove ${options.ariaLabel.toLowerCase()}`);
    row.append(remove);
    container.append(row);
  });
}

function renderEvidence(task) {
  const list = byId('evidence-list');
  const evidence = Array.isArray(task.evidence) ? task.evidence : [];
  byId('evidence-count').textContent = `${evidence.length} attached`;
  list.replaceChildren();
  if (evidence.length === 0) {
    list.append(textElement('p', 'plain-list-row', 'No evidence attached yet.'));
    return;
  }

  evidence.forEach((item) => {
    const card = textElement('article', 'evidence-card');
    const header = textElement('div', 'evidence-card-header');
    const title = document.createElement('strong');
    title.append(textElement('span', 'evidence-kind', EVIDENCE_KIND_LABELS[item.kind] || 'Evidence'));
    title.append(document.createTextNode(`  ${item.label}`));
    header.append(title);
    header.append(textElement('small', '', formatDate(item.createdAt)));
    card.append(header);
    card.append(textElement('p', '', item.content));
    const remove = textElement('button', 'button button-text button-danger', 'Remove evidence');
    remove.type = 'button';
    remove.dataset.action = 'remove-evidence';
    remove.dataset.itemId = item.id;
    card.append(remove);
    list.append(card);
  });
}

function renderTaskDetail() {
  const task = taskById(state.selectedTaskId);
  if (!task) return;
  byId('dialog-title').textContent = task.title || 'Edit task';
  byId('task-title').value = task.title;
  byId('task-type').value = task.type;
  byId('task-status').value = task.status;
  byId('task-summary').value = task.summary;
  byId('task-next-action').value = task.recommendedNextAction;

  renderGate(task);
  renderEditableList(byId('criteria-list'), task.acceptanceCriteria, {
    checkbox: true,
    checkedField: 'verified',
    toggleAction: 'toggle-criterion',
    editAction: 'edit-criterion',
    removeAction: 'remove-criterion',
    ariaLabel: 'Acceptance criterion',
    emptyText: 'No criteria yet. Add one before completing this task.',
  });
  renderEditableList(byId('subtasks-list'), task.subtasks, {
    checkbox: true,
    checkedField: 'completed',
    toggleAction: 'toggle-subtask',
    editAction: 'edit-subtask',
    removeAction: 'remove-subtask',
    ariaLabel: 'Subtask',
    emptyText: 'No subtasks yet.',
  });
  renderStringList(byId('commands-list'), task.verificationCommands, {
    editAction: 'edit-command',
    removeAction: 'remove-command',
    ariaLabel: 'Verification command',
    emptyText: 'No commands added yet.',
  });
  renderStringList(byId('risks-list'), task.risks, {
    editAction: 'edit-risk',
    removeAction: 'remove-risk',
    ariaLabel: 'Risk',
    emptyText: 'No risks recorded.',
  });
  renderStringList(byId('questions-list'), task.openQuestions, {
    editAction: 'edit-question',
    removeAction: 'remove-question',
    ariaLabel: 'Open question',
    emptyText: 'No open questions.',
  });
  renderEvidence(task);
}

function openTask(id) {
  if (!taskById(id)) return;
  state.selectedTaskId = id;
  renderTaskDetail();
  if (!dialog.open) dialog.showModal();
}

function closeTaskDialog() {
  state.selectedTaskId = null;
  persist();
  renderBoard();
  if (dialog.open) dialog.close();
}

function attemptMove(id, nextStatus) {
  const task = taskById(id);
  if (!task) return false;
  const result = transitionTask(task, nextStatus, now());
  if (!result.ok) {
    showToast(result.reasons.join(' '), true);
    if (state.selectedTaskId === id) renderTaskDetail();
    renderBoard();
    return false;
  }

  replaceTask(result.task);
  renderBoard();
  if (state.selectedTaskId === id) renderTaskDetail();
  showToast(`Moved to ${STATUS_LABELS[nextStatus]}.`);
  return true;
}

function addCriterion() {
  const task = taskById(state.selectedTaskId);
  if (!task) return;
  task.acceptanceCriteria.push({ id: createId('criterion'), text: 'New acceptance criterion', verified: false });
  touch(task);
  renderTaskDetail();
}

function addSubtask() {
  const task = taskById(state.selectedTaskId);
  if (!task) return;
  task.subtasks.push({ id: createId('subtask'), text: 'New subtask', completed: false });
  touch(task);
  renderTaskDetail();
}

function addStringItem(field, placeholder) {
  const task = taskById(state.selectedTaskId);
  if (!task) return;
  task[field].push(placeholder);
  touch(task);
  renderTaskDetail();
}

function handleDialogInput(event) {
  const target = event.target;
  const task = taskById(state.selectedTaskId);
  if (!task) return;

  if (target.dataset.field) {
    task[target.dataset.field] = target.value;
    touch(task);
    if (target.dataset.field === 'title') byId('dialog-title').textContent = target.value || 'Edit task';
    return;
  }

  const action = target.dataset.action;
  if (action === 'edit-criterion' || action === 'edit-subtask') {
    const collection = action === 'edit-criterion' ? task.acceptanceCriteria : task.subtasks;
    const item = collection.find((entry) => entry.id === target.dataset.itemId);
    if (item) {
      item.text = target.value;
      touch(task);
      renderGate(task);
    }
    return;
  }

  if (action === 'edit-command' || action === 'edit-risk' || action === 'edit-question') {
    const field = { 'edit-command': 'verificationCommands', 'edit-risk': 'risks', 'edit-question': 'openQuestions' }[action];
    task[field][Number(target.dataset.index)] = target.value;
    touch(task);
  }
}

function handleDialogChange(event) {
  const target = event.target;
  const task = taskById(state.selectedTaskId);
  if (!task) return;

  if (target.id === 'task-status') {
    attemptMove(task.id, target.value);
    return;
  }

  if (target.dataset.field) {
    task[target.dataset.field] = target.value;
    touch(task);
    return;
  }

  const action = target.dataset.action;
  if (action === 'toggle-criterion' || action === 'toggle-subtask') {
    const collection = action === 'toggle-criterion' ? task.acceptanceCriteria : task.subtasks;
    const item = collection.find((entry) => entry.id === target.dataset.itemId);
    if (item) {
      item[action === 'toggle-criterion' ? 'verified' : 'completed'] = target.checked;
      touch(task);
      renderTaskDetail();
    }
  }
}

function handleDialogClick(event) {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;
  const action = actionTarget.dataset.action;
  const task = taskById(state.selectedTaskId);

  if (action === 'close-dialog') {
    closeTaskDialog();
    return;
  }
  if (action === 'delete-task') {
    deleteSelectedTask();
    return;
  }
  if (action === 'add-criterion') return addCriterion();
  if (action === 'add-subtask') return addSubtask();
  if (action === 'add-command') return addStringItem('verificationCommands', 'New verification command');
  if (action === 'add-risk') return addStringItem('risks', 'New risk');
  if (action === 'add-question') return addStringItem('openQuestions', 'New open question');
  if (!task) return;

  const itemId = actionTarget.dataset.itemId;
  const index = Number(actionTarget.dataset.index);
  const collectionByAction = {
    'remove-criterion': 'acceptanceCriteria',
    'remove-subtask': 'subtasks',
    'remove-command': 'verificationCommands',
    'remove-risk': 'risks',
    'remove-question': 'openQuestions',
  };

  if (collectionByAction[action]) {
    const field = collectionByAction[action];
    if (itemId) task[field] = task[field].filter((item) => item.id !== itemId);
    else task[field].splice(index, 1);
    touch(task);
    renderTaskDetail();
    return;
  }

  if (action === 'remove-evidence') {
    task.evidence = task.evidence.filter((item) => item.id !== itemId);
    touch(task);
    renderTaskDetail();
    return;
  }

  if (action === 'attach-evidence') {
    const result = addEvidence(task, {
      kind: byId('evidence-kind').value,
      label: byId('evidence-label').value || EVIDENCE_KIND_LABELS[byId('evidence-kind').value],
      content: byId('evidence-content').value,
    }, { now: now() });
    if (!result.ok) {
      showToast(result.error, true);
      return;
    }
    replaceTask(result.task);
    byId('evidence-label').value = '';
    byId('evidence-content').value = '';
    renderTaskDetail();
    showToast('Evidence attached.');
  }
}

function deleteSelectedTask() {
  if (!state.selectedTaskId) return;
  const task = taskById(state.selectedTaskId);
  if (!task || !window.confirm(`Delete "${task.title}"?`)) return;
  state.tasks = state.tasks.filter((item) => item.id !== task.id);
  state.demoMode = false;
  state.selectedTaskId = null;
  persist();
  if (dialog.open) dialog.close();
  renderBoard();
  showToast('Task deleted.');
}

function loadDemo() {
  if (state.tasks.length > 0 && !window.confirm('Replace the current board with the sample demo?')) return;
  state.tasks = createSampleTasks();
  state.demoMode = true;
  state.selectedTaskId = null;
  persist();
  if (dialog.open) dialog.close();
  renderBoard();
  showToast('Sample demo loaded.');
}

function clearBoard() {
  if (state.tasks.length > 0 && !window.confirm('Clear every task from this local board?')) return;
  state.tasks = [];
  state.demoMode = false;
  state.selectedTaskId = null;
  persist();
  if (dialog.open) dialog.close();
  renderBoard();
  showToast('Board cleared.');
}

function createBlankTask() {
  const task = createTask({
    title: 'New task',
    summary: 'Add a concise summary for this task.',
    recommendedNextAction: 'Describe the outcome, add criteria, and move this task to Ready.',
  });
  state.tasks.unshift(task);
  state.demoMode = false;
  persist();
  renderBoard();
  openTask(task.id);
}

plannerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const source = sourceInput.value.trim();
  if (!source) {
    showToast('Paste an issue or task before generating a card.', true);
    sourceInput.focus();
    return;
  }
  const task = planTask(source);
  state.tasks.unshift(task);
  state.demoMode = false;
  sourceInput.value = '';
  persist();
  renderBoard();
  openTask(task.id);
  showToast('Task card generated locally.');
});

document.addEventListener('click', (event) => {
  const prompt = event.target.closest('[data-prompt]');
  if (prompt) {
    sourceInput.value = prompt.dataset.prompt;
    sourceInput.focus();
    return;
  }

  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget || actionTarget.closest('#task-dialog')) return;
  const action = actionTarget.dataset.action;
  if (action === 'load-demo') loadDemo();
  if (action === 'clear-board') clearBoard();
  if (action === 'new-task') createBlankTask();
});

taskForm.addEventListener('submit', (event) => event.preventDefault());
taskForm.addEventListener('input', handleDialogInput);
taskForm.addEventListener('change', handleDialogChange);
taskForm.addEventListener('click', handleDialogClick);
dialog.addEventListener('cancel', () => {
  state.selectedTaskId = null;
  renderBoard();
});
dialog.addEventListener('close', () => {
  state.selectedTaskId = null;
  renderBoard();
});

renderBoard();
