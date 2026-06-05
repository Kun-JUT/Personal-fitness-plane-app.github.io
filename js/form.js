// ===== FORM.JS — Wizard logic =====
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ---- Auth guard ----
onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "auth.html";
});

document.addEventListener('DOMContentLoaded', () => {

  // ---- State ----
  const selections = {};
  let currentStep = 0;
  const TOTAL_STEPS = 3;

  // ---- DOM refs ----
  const steps     = document.querySelectorAll('.form-step');
  const wsteps    = document.querySelectorAll('.wstep');
  const wlines    = document.querySelectorAll('.wstep-line');
  const dots      = document.querySelectorAll('.sdot');
  const btnBack   = document.getElementById('btn-back');
  const btnNext   = document.getElementById('btn-next');
  const errEl     = document.getElementById('form-error');
  const daysHint  = document.getElementById('days-hint');
  const summaryCard = document.getElementById('summary-card');
  const summaryTags = document.getElementById('summary-tags');

  // Clear any previously saved prefs so the form always starts fresh
  localStorage.removeItem('fitforge_prefs');

  updateDaysHint();
  updateSummary();

  // ---- Button click handler (all option buttons) ----
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-group]');
    if (!btn) return;

    const group = btn.dataset.group;
    const value = btn.dataset.value;

    document.querySelectorAll(`[data-group="${group}"]`).forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selections[group] = group === 'days' ? parseInt(value) : value;

    clearError();
    updateDaysHint();
    updateSummary();
  });

  // ---- Navigation ----
  btnNext.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS - 1) {
      goToStep(currentStep + 1);
    } else {
      submitForm();
    }
  });

  btnBack.addEventListener('click', () => {
    if (currentStep > 0) goToStep(currentStep - 1);
  });

  function goToStep(n) {
    steps[currentStep].classList.remove('active');
    currentStep = n;
    steps[currentStep].classList.add('active');
    updateNav();
    updateWizardBar();
    clearError();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateNav() {
    btnBack.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
    if (currentStep === TOTAL_STEPS - 1) {
      btnNext.innerHTML = `Згенерувати <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3l5 5-5 5M13 8H3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    } else {
      btnNext.innerHTML = `Далі <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
    dots.forEach((d, i) => d.classList.toggle('active', i === currentStep));
  }

  function updateWizardBar() {
    wsteps.forEach((ws, i) => {
      ws.classList.toggle('active', i === currentStep);
      ws.classList.toggle('done', i < currentStep);
    });
    wlines.forEach((l, i) => l.classList.toggle('done', i < currentStep));
  }

  // ---- Validation ----
  const stepFields = [
    ['goal', 'gender'],
    ['level', 'type'],
    ['days']
  ];
  const fieldLabels = {
    goal: 'ціль', gender: 'стать',
    level: 'рівень підготовки', type: 'тип програми', days: 'кількість тренувань'
  };

  function validateStep(s) {
    const missing = stepFields[s].filter(f => selections[f] === undefined);
    if (missing.length) {
      showError('Будь ласка, оберіть: ' + missing.map(f => fieldLabels[f]).join(', '));
      missing.forEach(group => {
        document.querySelectorAll(`[data-group="${group}"]`).forEach(b => {
          b.style.borderColor = '#fca5a5';
          setTimeout(() => { b.style.borderColor = ''; }, 2000);
        });
      });
      return false;
    }
    return true;
  }

  function showError(msg) { errEl.textContent = msg; errEl.style.opacity = '1'; }
  function clearError()   { errEl.textContent = '';  errEl.style.opacity = '0'; }

  // ---- Days hint ----
  const dayHints = {
    1: '1 день — мінімум, але ефективно для початківців',
    2: '2 дні — хороший старт для відновлення сил',
    3: '3 дні — оптимальний баланс для більшості цілей',
    4: '4 дні — підходить для просунутих програм',
    5: '5 днів — інтенсивний графік, потрібен досвід'
  };
  function updateDaysHint() {
    if (selections.days && daysHint) daysHint.textContent = dayHints[selections.days] || '';
  }

  // ---- Summary ----
  const labels = {
    goal:   { mass: '💪 Набір маси', relief: '🔥 Схуднення', strength: '⚡ Сила', support: '🎯 Підтримка' },
    gender: { male: '♂ Чоловік', female: '♀ Жінка' },
    level:  { beginner: '🌱 Початковий', intermediate: '🏋️ Середній', advanced: '🔱 Просунутий' },
    type:   { fullbody: 'Full Body', upperlower: 'Верх-Низ', ptn: 'PPL', split: 'Спліт' }
  };
  function updateSummary() {
    if (!summaryCard) return;
    const tags = ['goal','gender','level','type']
      .filter(f => selections[f])
      .map(f => `<span class="stag">${labels[f][selections[f]] || selections[f]}</span>`);
    if (selections.days) tags.push(`<span class="stag">📅 ${selections.days} дн/тижд.</span>`);
    if (tags.length) { summaryTags.innerHTML = tags.join(''); summaryCard.classList.add('visible'); }
    else summaryCard.classList.remove('visible');
  }

  // ---- Submit ----
  async function submitForm() {
    if (!validateStep(currentStep)) return;
    const allRequired = ['goal', 'gender', 'level', 'type', 'days'];
    if (allRequired.some(f => selections[f] === undefined)) {
      showError('Будь ласка, заповніть усі поля'); return;
    }

    btnNext.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="animation:spin 0.8s linear infinite"><path d="M8 2a6 6 0 1 0 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Зберігаємо...`;
    btnNext.disabled = true;

    // Зберегти в Firestore (якщо залогінений)
    const user = auth.currentUser;
    if (user) {
      try {
        await addDoc(collection(db, "users", user.uid, "plans"), {
          ...selections,
          createdAt: serverTimestamp()
        });
      } catch (e) {
        console.warn("Firestore write failed:", e);
      }
    }

    // Транспорт на plan.html
    localStorage.setItem('fitforge_prefs', JSON.stringify(selections));
    window.location.href = 'plan.html';
  }

  // Spin animation
  const style = document.createElement('style');
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
});
