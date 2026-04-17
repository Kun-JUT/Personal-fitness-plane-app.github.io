// ===== PLAN.JS — Training plan renderer =====

// ---- Config ----
const WEEKDAYS_UK = ['Понеділок','Вівторок','Середа','Четвер','П\'ятниця','Субота','Неділя'];

const LOAD_MSGS = [
  'Підбираємо вправи...',
  'Складаємо розклад...',
  'Розраховуємо навантаження...',
  'Майже готово!'
];

const GOAL_LABELS = {
  mass: 'Набір маси', relief: 'Схуднення',
  strength: 'Сила', support: 'Підтримка форми'
};
const LEVEL_LABELS = {
  beginner: 'Початковий', intermediate: 'Середній', advanced: 'Просунутий'
};
const TYPE_LABELS = {
  fullbody: 'Повне тіло', upperlower: 'Верх-Низ', ptn: 'Тягни/Товкай/Ноги', split: 'Спліт'
};
const LEVEL_UK = {
  beginner: 'початковий', intermediate: 'середній', advanced: 'просунутий'
};
const PLAN_FILES = {
  fullbody: 'plans/fullbody.json',
  upperlower: 'plans/upperlower.json',
  ptn: 'plans/ptn.json',
  split: 'plans/split.json'
};

// ---- Day type → badge class ----
function getDayBadge(title) {
  if (!title) return { cls: 'badge-rest', label: 'Відпочинок' };
  const t = title.toLowerCase();
  if (t.includes('товкай') || t.includes('push') || t.includes('груди') || t.includes('chest')) return { cls: 'badge-push', label: 'Товкай' };
  if (t.includes('тягни') || t.includes('pull') || t.includes('спина') || t.includes('back'))   return { cls: 'badge-pull', label: 'Тягни' };
  if (t.includes('ноги') || t.includes('leg'))  return { cls: 'badge-legs', label: 'Ноги' };
  if (t.includes('верх') || t.includes('upper')) return { cls: 'badge-upper', label: 'Верх' };
  if (t.includes('низ') || t.includes('lower'))  return { cls: 'badge-lower', label: 'Низ' };
  if (t.includes('фулбоді') || t.includes('full')) return { cls: 'badge-full', label: 'Full Body' };
  return { cls: 'badge-full', label: title.split(':')[0].trim() };
}

// ---- Muscle group from exercise name ----
function getMuscle(name) {
  const n = name.toLowerCase();
  if (/жим|груд|chest|bench|push/.test(n))       return { label: 'Груди',   cls: 'muscle-chest' };
  if (/тяг|спин|підтяг|row|pull|back/.test(n))   return { label: 'Спина',   cls: 'muscle-back' };
  if (/присід|випад|ноги|squat|lunge|leg/.test(n)) return { label: 'Ноги',  cls: 'muscle-legs' };
  if (/плеч|shoulder|жим стоячи|Arnold/.test(n)) return { label: 'Плечі',   cls: 'muscle-shoulders' };
  if (/біцеп|трицеп|arm|підйом на біц/.test(n))  return { label: 'Руки',    cls: 'muscle-arms' };
  if (/прес|кор|планк|скруч|core|ab/.test(n))    return { label: 'Кор',     cls: 'muscle-core' };
  if (/кардіо|берп|cardio|run|біг/.test(n))       return { label: 'Кардіо', cls: 'muscle-cardio' };
  return { label: '', cls: 'muscle-default' };
}

// ---- Tips by exercise keyword ----
function getTip(name) {
  const n = name.toLowerCase();
  if (/жим.*лежа|bench/.test(n))     return 'Тримайте лопатки зведеними, не відривайте ягодиці від лавки. Контролюйте опускання.';
  if (/присід|squat/.test(n))        return 'Коліна над носками, спина рівна. Глибина — до паралелі або нижче за можливості.';
  if (/станов|deadlift/.test(n))     return 'Нейтральний хребет протягом усього руху. Штанга ковзає по ногах.';
  if (/підтяг|pull-up/.test(n))      return 'Починайте рух лопатками, не руками. Повне розгинання внизу.';
  if (/планк|plank/.test(n))         return 'Тіло — одна пряма лінія. Не провалюйте поперек, не піднімайте таз.';
  if (/випад|lunge/.test(n))         return 'Переднє коліно над п\'яткою, заднє — над підлогою. Тулуб вертикальний.';
  if (/жим.*стоячи|overhead|жим штан.*стоячи/.test(n)) return 'Корпус стабільний, не відхиляйтесь назад. Пресуйте штангу вертикально.';
  if (/тяг.*нахил|row/.test(n))      return 'Спина паралельна підлозі, лопатки в кінці руху зводяться. Не смикайте корпусом.';
  if (/біцеп|curl/.test(n))          return 'Лікті фіксовані. Не гойдайтесь корпусом — контролюйте рух обома фазами.';
  if (/трицеп|tricep/.test(n))       return 'Повне розгинання у верхній точці. Лікті не розводьте в сторони.';
  if (/берп|burpee/.test(n))         return 'Темп помірний. Повне розгинання у стрибку, чіткий упор лежачи.';
  return 'Контролюйте рух в обох фазах (підйом і опускання). Техніка важливіша за вагу.';
}

// ---- Parse sets/reps from "more" or title ----
function parseSetsReps(more) {
  if (!more) return { sets: '3', reps: '10–12' };
  const setsMatch = more.match(/(\d+[-–]\d+|\d+)\s*підход/i);
  const repsMatch = more.match(/(\d+[-–]\d+|\d+)\s*повтор/i);
  return {
    sets: setsMatch ? setsMatch[1] : '3',
    reps: repsMatch ? repsMatch[1] : '10–12'
  };
}

// ---- Progress storage (sessionStorage) ----
function getDoneKey(dayIdx, exIdx) { return `fitforge_done_d${dayIdx}_e${exIdx}`; }
function isDone(dayIdx, exIdx) { return sessionStorage.getItem(getDoneKey(dayIdx, exIdx)) === '1'; }
function toggleDone(dayIdx, exIdx) {
  const k = getDoneKey(dayIdx, exIdx);
  sessionStorage.getItem(k) === '1' ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, '1');
}

// ---- Toast ----
function showToast(msg, type = '') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' toast-' + type : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

// ---- Main ----
document.addEventListener('DOMContentLoaded', async () => {

  const data = JSON.parse(localStorage.getItem('fitforge_prefs') || 'null');
  if (!data) {
    alert('Немає даних. Спочатку заповніть форму.');
    window.location.href = 'form.html';
    return;
  }

  // Loading animation
  await runLoader();

  // Load plan JSON
  const planData = await loadPlan(data.type);
  const planKey = buildPlanKey(data);
  const rawDays = extractDays(planKey, planData, data.days);

  // Render
  renderHeader(data);
  renderWeekTabs(rawDays);
  renderDays(rawDays, data);

  // Show main
  document.getElementById('plan-main').style.display = 'block';

  // Export buttons
  setupExport(data, rawDays);

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
});

// ---- Loader ----
async function runLoader() {
  const screen = document.getElementById('loading-screen');
  const msgEl  = document.getElementById('loading-msg');
  const fillEl = document.getElementById('loading-fill');

  const steps = [0, 30, 65, 90, 100];
  for (let i = 0; i < LOAD_MSGS.length; i++) {
    msgEl.textContent = LOAD_MSGS[i];
    fillEl.style.width = steps[i] + '%';
    await sleep(i === LOAD_MSGS.length - 1 ? 300 : 450);
  }
  fillEl.style.width = '100%';
  await sleep(300);
  screen.style.opacity = '0';
  screen.style.transition = 'opacity 0.4s ease';
  await sleep(400);
  screen.style.display = 'none';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---- Load plan JSON ----
async function loadPlan(type) {
  const path = PLAN_FILES[type];
  if (!path) return {};
  try {
    const res = await fetch(path);
    if (!res.ok) return {};
    return await res.json();
  } catch (e) {
    console.warn('Plan load failed:', e);
    return {};
  }
}

// ---- Build plan key ----
function buildPlanKey(data) {
  return `${LEVEL_UK[data.level] || data.level}_${data.days}_${data.goal}`;
}

// ---- Extract days from plan data ----
function extractDays(planKey, planData, daysPerWeek) {
  // Try exact key first
  let plan = planData && planData[planKey];

  // Fallback: find closest match by level + goal
  if (!plan || !plan.length) {
    const [level, , goal] = planKey.split('_');
    const fallbackKey = Object.keys(planData || {}).find(k => k.startsWith(level) && k.endsWith(goal));
    if (fallbackKey) plan = planData[fallbackKey];
  }

  const result = [];
  for (let i = 0; i < 7; i++) {
    if (plan && plan[i] && !plan[i].rest) {
      result.push({ rest: false, title: plan[i].title, exercises: plan[i].exercises || [], more: plan[i].more || '' });
    } else {
      result.push({ rest: true });
    }
  }
  return result;
}

// ---- Find next training day ----
function findNextDay(days) {
  const today = new Date().getDay(); // 0=Sun, 1=Mon…
  const todayIdx = today === 0 ? 6 : today - 1; // convert to Mon=0
  // Look from today forward, then wrap
  for (let offset = 0; offset < 7; offset++) {
    const idx = (todayIdx + offset) % 7;
    if (!days[idx].rest) return idx;
  }
  return -1;
}

// ---- Render header ----
function renderHeader(data) {
  const titleEl   = document.getElementById('plan-title');
  const summaryEl = document.getElementById('plan-summary');
  if (titleEl) titleEl.textContent = TYPE_LABELS[data.type] || 'Програма';
  if (summaryEl) {
    summaryEl.textContent = [
      GOAL_LABELS[data.goal],
      LEVEL_LABELS[data.level],
      `${data.days} тренувань/тижд.`,
      data.gender === 'male' ? 'Чоловік' : 'Жінка'
    ].join(' · ');
  }
}

// ---- Render week tabs ----
function renderWeekTabs(days) {
  const container = document.getElementById('week-tabs');
  if (!container) return;
  const nextIdx = findNextDay(days);

  days.forEach((day, i) => {
    const tab = document.createElement('button');
    const badge = getDayBadge(day.title);
    tab.className = 'week-tab' + (day.rest ? ' rest-tab' : '') + (i === nextIdx ? ' next-tab' : '');
    tab.textContent = WEEKDAYS_UK[i].slice(0, 2) + ' · ' + (day.rest ? 'Відп.' : badge.label);
    tab.addEventListener('click', () => {
      const card = document.getElementById(`day-card-${i}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // On mobile: open accordion
        if (window.innerWidth < 900 && !day.rest) toggleAccordion(card);
      }
    });
    container.appendChild(tab);
  });
}

// ---- Render days ----
function renderDays(days, data) {
  const container = document.getElementById('days-container');
  if (!container) return;
  const nextIdx = findNextDay(days);
  const setsReps = parseSetsReps(days.find(d => !d.rest)?.more || '');

  days.forEach((day, dayIdx) => {
    const card = document.createElement('div');
    card.className = 'day-card' + (dayIdx === nextIdx ? ' next-day' : '');
    card.id = `day-card-${dayIdx}`;
    // Default open on desktop; on mobile open only next
    if (window.innerWidth >= 900 || dayIdx === nextIdx) card.classList.add('open');

    const badge = getDayBadge(day.title);
    const exCount = day.exercises ? day.exercises.length : 0;

    // Header
    const header = document.createElement('div');
    header.className = 'day-header';
    header.innerHTML = `
      <span class="day-num">${dayIdx + 1}</span>
      <div class="day-meta">
        <div class="day-name">${WEEKDAYS_UK[dayIdx]}</div>
        <div class="day-label">
          <span class="day-type-badge ${badge.cls}">${badge.label}</span>
          ${!day.rest ? `<span class="day-count">${exCount} вправ</span>` : ''}
          ${dayIdx === nextIdx ? '<span class="next-badge">Наступна</span>' : ''}
        </div>
      </div>
      <svg class="day-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    header.addEventListener('click', () => {
      if (!day.rest) toggleAccordion(card);
    });

    card.appendChild(header);

    if (day.rest) {
      const rc = document.createElement('div');
      rc.className = 'rest-content';
      rc.innerHTML = `<span class="rest-icon">😴</span> День відпочинку — відновлення та ріст`;
      card.appendChild(rc);
    } else {
      const body = document.createElement('div');
      body.className = 'day-body';
      const inner = document.createElement('div');
      inner.className = 'day-body-inner';

      // Exercise cards
      (day.exercises || []).forEach((exName, exIdx) => {
        inner.appendChild(buildExCard(exName, dayIdx, exIdx, setsReps, day.more));
      });

      // Notes
      if (day.more) {
        const notes = document.createElement('div');
        notes.className = 'day-notes';
        notes.textContent = day.more;
        inner.appendChild(notes);
      }

      body.appendChild(inner);
      card.appendChild(body);
    }

    container.appendChild(card);
  });
}

function toggleAccordion(card) {
  card.classList.toggle('open');
}

// ---- Build exercise card element ----
function buildExCard(exName, dayIdx, exIdx, defaultSetsReps, more) {
  const parsed = parseSetsReps(more);
  const muscle = getMuscle(exName);
  const done   = isDone(dayIdx, exIdx);

  const card = document.createElement('div');
  card.className = 'exercise-card' + (done ? ' done' : '');
  card.dataset.dayIdx = dayIdx;
  card.dataset.exIdx  = exIdx;

  card.innerHTML = `
    <div class="ex-check" title="Відмітити виконано">
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <path d="M1.5 5.5L4 8.5L9.5 2.5" stroke="${'var(--clr-accent)'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-name">${exName}</div>
      <div class="ex-sets">${parsed.sets} підходи · ${parsed.reps} повторень</div>
    </div>
    ${muscle.label ? `<span class="ex-muscle ${muscle.cls}">${muscle.label}</span>` : ''}
    <button class="ex-expand-btn" title="Докладніше">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/>
        <path d="M7 6v4M7 4.5v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
    </button>`;

  // Checkbox click
  card.querySelector('.ex-check').addEventListener('click', e => {
    e.stopPropagation();
    toggleDone(dayIdx, exIdx);
    card.classList.toggle('done');
  });

  // Info button → modal
  card.querySelector('.ex-expand-btn').addEventListener('click', e => {
    e.stopPropagation();
    openModal(exName, parsed.sets, parsed.reps, muscle);
  });

  // Card click → modal (not checkbox area)
  card.addEventListener('click', e => {
    if (e.target.closest('.ex-check') || e.target.closest('.ex-expand-btn')) return;
    openModal(exName, parsed.sets, parsed.reps, muscle);
  });

  return card;
}

// ---- Modal ----
function openModal(name, sets, reps, muscle) {
  const overlay = document.getElementById('modal-overlay');
  const body    = document.getElementById('modal-body');
  const tip     = getTip(name);

  body.innerHTML = `
    <div class="modal-ex-name">${name}</div>
    <div class="modal-sets-row">
      <div class="modal-set-chip">
        <span class="modal-set-val">${sets}</span>
        <span class="modal-set-label">Підходи</span>
      </div>
      <div class="modal-set-chip">
        <span class="modal-set-val">${reps}</span>
        <span class="modal-set-label">Повторення</span>
      </div>
    </div>
    <div class="modal-tip">
      <strong>Техніка</strong>
      ${tip}
    </div>
    ${muscle.label ? `<div class="modal-muscle-row"><span class="ex-muscle ${muscle.cls}">${muscle.label}</span></div>` : ''}`;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ---- Export: PDF ----
function exportPDF(data, days) {
  showToast('Підготовка PDF...', '');

  // Build a print-friendly page and trigger print dialog
  const lines = [];
  lines.push(`FITFORGE — ${TYPE_LABELS[data.type] || 'Програма'}`);
  lines.push(`${GOAL_LABELS[data.goal]} · ${LEVEL_LABELS[data.level]} · ${data.days} тр/тижд.\n`);

  days.forEach((day, i) => {
    lines.push(`День ${i + 1} — ${WEEKDAYS_UK[i]}`);
    if (day.rest) {
      lines.push('  Відпочинок\n');
    } else {
      lines.push(`  ${day.title}`);
      (day.exercises || []).forEach((ex, idx) => { lines.push(`  ${idx + 1}. ${ex}`); });
      if (day.more) lines.push(`  → ${day.more}`);
      lines.push('');
    }
  });

  const win = window.open('', '_blank');
  if (!win) { showToast('Дозвольте спливаючі вікна для експорту', 'error'); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>FitForge Plan</title>
    <style>
      body { font-family: 'Montserrat', sans-serif; padding: 40px; color: #111; max-width: 700px; margin: 0 auto; }
      h1 { font-size: 2rem; margin-bottom: 4px; }
      p.sub { color: #666; margin-bottom: 28px; font-size: 0.9rem; }
      .day { margin-bottom: 20px; }
      .day-title { font-weight: 700; font-size: 1rem; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; }
      .ex { font-size: 0.85rem; padding: 2px 0; }
      .note { font-style: italic; font-size: 0.78rem; color: #888; margin-top: 4px; }
      @media print { body { padding: 20px; } }
    </style></head><body>
    <h1>FITFORGE</h1>
    <p class="sub">${GOAL_LABELS[data.goal]} · ${LEVEL_LABELS[data.level]} · ${data.days} тренувань/тижд.</p>
    ${days.map((d, i) => `<div class="day">
      <div class="day-title">День ${i + 1} — ${WEEKDAYS_UK[i]}${d.title ? ' · ' + d.title : ''}</div>
      ${d.rest ? '<div class="ex">Відпочинок</div>' :
        (d.exercises || []).map((e, idx) => `<div class="ex">${idx + 1}. ${e}</div>`).join('') +
        (d.more ? `<div class="note">${d.more}</div>` : '')}
    </div>`).join('')}
    <script>window.onload = function() { window.print(); }<\/script>
  </body></html>`);
  win.document.close();
}

// ---- Export: ICS calendar ----
function exportICS(data, days) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'PRODID:-//FitForge//UA'];
  const today = new Date();
  // Find next Monday
  const dayOfWeek = today.getDay();
  const daysToMon = (dayOfWeek === 0 ? 1 : 8 - dayOfWeek);
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMon);

  days.forEach((day, i) => {
    if (day.rest) return;
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const yyyymmdd = d.toISOString().slice(0, 10).replace(/-/g, '');
    const exList = (day.exercises || []).join('\\n');
    lines.push('BEGIN:VEVENT');
    lines.push(`DTSTART;VALUE=DATE:${yyyymmdd}`);
    lines.push(`DTEND;VALUE=DATE:${yyyymmdd}`);
    lines.push(`SUMMARY:FitForge · ${day.title || TYPE_LABELS[data.type]}`);
    lines.push(`DESCRIPTION:${exList}\\n\\n${day.more || ''}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'fitforge-plan.ics';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Файл .ics завантажено!', 'success');
}

// ---- Share ----
function sharePlan(data) {
  const text = `Моя програма FitForge: ${GOAL_LABELS[data.goal]}, ${LEVEL_LABELS[data.level]}, ${data.days} тр/тижд.`;
  if (navigator.share) {
    navigator.share({ title: 'FitForge план', text, url: window.location.href }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text + ' — ' + window.location.href)
      .then(() => showToast('Посилання скопійовано!', 'success'))
      .catch(() => showToast('Не вдалося скопіювати', 'error'));
  }
}

// ---- Setup export buttons ----
function setupExport(data, days) {
  document.getElementById('btn-pdf')?.addEventListener('click', () => exportPDF(data, days));
  document.getElementById('btn-ics')?.addEventListener('click', () => exportICS(data, days));
  document.getElementById('btn-share')?.addEventListener('click', () => sharePlan(data));
}

// ---- Clear prefs when navigating back to form ----
document.querySelectorAll('a[href="form.html"]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('fitforge_prefs');
    window.location.href = 'form.html';
  });
});
