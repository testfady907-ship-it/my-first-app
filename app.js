'use strict';

const STORAGE_KEY = 'my-first-app.tasks.v1';
const form = document.querySelector('#task-form');
const input = document.querySelector('#task-input');
const error = document.querySelector('#form-error');
const list = document.querySelector('#task-list');
const remaining = document.querySelector('#remaining');
const emptyState = document.querySelector('#empty-state');
const storageStatus = document.querySelector('#storage-status');
const dueInput = document.querySelector('#task-due');
const dueAlert = document.querySelector('#due-alert');
const notificationButton = document.querySelector('#enable-notifications');
const notificationStatus = document.querySelector('#notification-status');
const soundButton = document.querySelector('#toggle-sound');
const testSoundButton = document.querySelector('#test-sound');
const soundStatus = document.querySelector('#sound-status');
let audioContext = null;
let soundEnabled = false;
const dateFormat = new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' });
let dueViews = [];
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
  dueViews = [];
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
      checkReminders();
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
    const content = document.createElement('div');
    content.className = 'task-content';
    content.append(label);
    const dueLabel = document.createElement('span');
    dueLabel.className = 'due-label';
    const schedule = document.createElement('div');
    schedule.className = 'task-schedule';
    const scheduleLabel = document.createElement('label');
    const dateInput = document.createElement('input');
    dateInput.type = 'datetime-local';
    dateInput.id = `due-${dueViews.length}`;
    dateInput.value = validDue(task.due) ? task.due : '';
    scheduleLabel.htmlFor = dateInput.id;
    scheduleLabel.textContent = 'موعد التذكير';
    dateInput.setAttribute('aria-label', `موعد تذكير المهمة: ${task.text}`);
    dateInput.addEventListener('change', () => {
      if (dateInput.value && !validDue(dateInput.value)) return;
      task.due = dateInput.value || null;
      task.notifiedFor = null;
      task.soundedFor = null;
      saveTasks();
      checkReminders();
    });
    schedule.append(scheduleLabel, dateInput);
    content.append(dueLabel, schedule);
    dueViews.push({task, item, dueLabel});
    item.append(content, remove);
    list.append(item);
  }
  emptyState.hidden = tasks.length > 0;
  updateCount();
  checkReminders();
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
  if (dueInput.value && !validDue(dueInput.value)) {
    error.textContent = 'اختر تاريخًا ووقتًا صحيحين.';
    error.hidden = false;
    dueInput.focus();
    return;
  }
  tasks.push({ id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, text, completed: false, due: dueInput.value || null, notifiedFor: null });
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
function validDue(value) {
  return typeof value === 'string' && value.length > 0 && Number.isFinite(new Date(value).getTime());
}

function checkReminders() {
  const now = Date.now();
  const dueTasks = [];
  const soundTasks = [];
  let changed = false;
  for (const {task, item, dueLabel} of dueViews) {
    const hasDue = validDue(task.due);
    const isDue = hasDue && !task.completed && new Date(task.due).getTime() <= now;
    item.classList.toggle('overdue', isDue);
    dueLabel.hidden = !hasDue;
    dueLabel.textContent = hasDue ? `${task.completed ? 'الموعد' : isDue ? 'حان موعدها' : 'تذكير في'}: ${dateFormat.format(new Date(task.due))}` : '';
    if (!isDue) continue;
    dueTasks.push(task);
    if (soundEnabled && task.soundedFor !== task.due) soundTasks.push(task);
    if (task.notifiedFor === task.due) continue;
    if ('Notification' in globalThis && Notification.permission === 'granted') {
      try {
        new Notification('مهامي — حان موعد المهمة', {body: task.text, tag: `task-${task.id}`});
        task.notifiedFor = task.due;
        changed = true;
      } catch {
        notificationStatus.textContent = 'إشعارات النظام غير متاحة هنا؛ ستظهر التذكيرات داخل التطبيق.';
      }
    }
  }
  const message = dueTasks.length ? `حان موعد ${number.format(dueTasks.length)} من مهامك: ${dueTasks.map(task => task.text).join('، ')}` : '';
  dueAlert.hidden = !message;
  if (dueAlert.textContent !== message) dueAlert.textContent = message;
  // One chime for tasks becoming due together, independent of notification permission.
  if (soundTasks.length && playReminderSound()) {
    for (const task of soundTasks) task.soundedFor = task.due;
    changed = true;
  }
  if (changed) saveTasks();
}

function playReminderSound() {
  if (!soundEnabled || !audioContext) return false;
  if (audioContext.state !== 'running') {
    soundStatus.textContent = 'الصوت متوقف مؤقتًا. اضغط «تجربة الصوت» لإعادة تفعيله.';
    return false;
  }
  try {
    const start = audioContext.currentTime;
    [659.25, 880].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const time = start + index * 0.24;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.16, time + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(time);
      oscillator.stop(time + 0.5);
    });
    soundStatus.textContent = 'صوت التذكير مفعّل لهذه الصفحة. تأكد من رفع صوت الجهاز وعدم كتم التبويب.';
    return true;
  } catch {
    soundStatus.textContent = 'تعذّر تشغيل الصوت. جرّب تفعيله مجددًا؛ التذكير المرئي يعمل.';
    return false;
  }
}

async function activateSound() {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextClass) {
    soundStatus.textContent = 'هذا المتصفح لا يدعم صوت التذكير. إشعارات التطبيق ما زالت متاحة.';
    return;
  }
  try {
    if (!audioContext || audioContext.state === 'closed') audioContext = new AudioContextClass();
    await audioContext.resume();
    if (audioContext.state !== 'running') throw new Error('Audio is suspended');
    soundEnabled = true;
    soundButton.textContent = 'كتم صوت التذكير';
    soundButton.setAttribute('aria-pressed', 'true');
    testSoundButton.hidden = false;
    playReminderSound();
  } catch {
    soundStatus.textContent = 'لم يتم تفعيل الصوت. اضغط مجددًا للسماح بتشغيله.';
  }
}
soundButton.addEventListener('click', () => {
  if (!soundEnabled) return activateSound();
  soundEnabled = false;
  soundButton.textContent = 'تفعيل صوت التذكير';
  soundButton.setAttribute('aria-pressed', 'false');
  testSoundButton.hidden = true;
  soundStatus.textContent = 'صوت التذكير مكتوم. الإشعارات والتذكير المرئي يعملان.';
});
testSoundButton.addEventListener('click', activateSound);

function updateNotificationStatus() {
  const supported = 'Notification' in globalThis;
  const permission = supported ? Notification.permission : 'unsupported';
  notificationButton.disabled = !supported || permission === 'granted' || permission === 'denied';
  notificationStatus.textContent = permission === 'granted' ? 'إشعارات المتصفح مفعّلة. يعمل التذكير أثناء فتح التطبيق.' : permission === 'denied' ? 'الإشعارات محظورة. يمكنك السماح بها من إعدادات الموقع؛ التذكير داخل التطبيق يعمل.' : !supported ? 'هذا المتصفح لا يدعم إشعارات النظام؛ التذكير داخل التطبيق يعمل.' : 'يمكنك تفعيل الإشعارات أو الاكتفاء بالتذكير داخل التطبيق.';
}
notificationButton.addEventListener('click', async () => {
  try {
    await Notification.requestPermission();
    updateNotificationStatus();
    checkReminders();
  } catch {
    notificationStatus.textContent = 'تعذّر تفعيل الإشعارات؛ التذكير داخل التطبيق يعمل.';
  }
});
updateNotificationStatus();
render();
setInterval(checkReminders, 10000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) checkReminders();
});
