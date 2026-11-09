'use strict';

const STORAGE_KEY = 'my-first-app.tasks.v1';
const form = document.querySelector('#task-form');
const input = document.querySelector('#task-input');
const error = document.querySelector('#form-error');
const list = document.querySelector('#task-list');
const remaining = document.querySelector('#remaining');
const emptyState = document.querySelector('#empty-state');
const storageStatus = document.querySelector('#storage-status');
const number = new Intl.NumberFormat('ar', { numberingSystem: 'arab' });
let tasks = loadTasks();

function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) throw new Error('Invalid task data');
    return stored.filter(task => task && typeof task.id === 'string' &&
      typeof task.text === 'string' && task.text.trim() && typeof task.completed === 'boolean');
  } catch {
    storageStatus.textContent = 'تعذّر قراءة المهام المحفوظة. يمكنك استخدام القائمة الآن.';
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    storageStatus.textContent = 'تُحفظ مهامك تلقائيًا في هذا المتصفح';
  } catch {
    storageStatus.textContent = 'تعذّر الحفظ. قد تضيع التغييرات عند إغلاق الصفحة.';
  }
}

function render() {
  list.replaceChildren();
  for (const task of tasks) {
    const item = document.createElement('li');
    item.classList.toggle('completed', task.completed);
    const label = document.createElement('label');
    label.className = 'task-label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => {
      task.completed = checkbox.checked;
      item.classList.toggle('completed', task.completed);
      saveTasks();
      updateCount();
    });
    const text = document.createElement('span');
    text.className = 'task-text';
    text.dir = 'auto';
    text.textContent = task.text;
    label.append(checkbox, text);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-button';
    remove.setAttribute('aria-label', `حذف المهمة: ${task.text}`);
    remove.title = 'حذف المهمة';
    remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
    remove.addEventListener('click', () => {
      const index = tasks.indexOf(task);
      tasks.splice(index, 1);
      saveTasks();
      render();
      const next = list.children[Math.min(index, tasks.length - 1)];
      if (next) next.querySelector('.delete-button').focus();
      else input.focus();
    });
    item.append(label, remove);
    list.append(item);
  }
  emptyState.hidden = tasks.length > 0;
  updateCount();
}

function updateCount() {
  remaining.textContent = `المهام المتبقية: ${number.format(tasks.filter(task => !task.completed).length)}`;
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    error.textContent = 'اكتب المهمة أولًا، ثم اضغط إضافة.';
    error.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  tasks.push({ id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, text, completed: false });
  saveTasks();
  render();
  form.reset();
  clearError();
  input.focus();
});

function clearError() {
  error.hidden = true;
  input.removeAttribute('aria-invalid');
}
input.addEventListener('input', clearError);
render();
