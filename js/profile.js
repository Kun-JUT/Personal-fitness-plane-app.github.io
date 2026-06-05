// ===== PROFILE.JS — особистий кабінет =====
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, query, orderBy, getDocs,
  doc, deleteDoc, updateDoc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ---- Labels ----
const GOAL_LABELS  = { mass: "💪 Набір маси", relief: "🔥 Схуднення", strength: "⚡ Сила", support: "🎯 Підтримка" };
const LEVEL_LABELS = { beginner: "🌱 Початковий", intermediate: "🏋️ Середній", advanced: "🔱 Просунутий" };
const TYPE_LABELS  = { fullbody: "Full Body", upperlower: "Верх-Низ", ptn: "PPL", split: "Спліт" };

let currentUser = null;

// ---- Auth guard ----
onAuthStateChanged(auth, async user => {
  if (!user) { window.location.href = "auth.html"; return; }
  currentUser = user;
  renderUserInfo(user);
  await Promise.all([loadStats(user.uid), loadPlans(user.uid), loadFavorites(user.uid)]);
});

// ---- Render user info ----
function renderUserInfo(user) {
  const name   = user.displayName || user.email.split("@")[0];
  const avatar = user.photoURL;

  document.getElementById("profile-name").textContent  = name;
  document.getElementById("profile-email").textContent = user.email || "";

  const avatarEl = document.getElementById("profile-avatar");
  if (avatar) {
    avatarEl.src = avatar;
  } else {
    // Initials avatar
    avatarEl.style.display = "none";
    const initEl = document.getElementById("profile-initials");
    if (initEl) initEl.textContent = name.charAt(0).toUpperCase();
  }
}

// ---- Stats ----
async function loadStats(uid) {
  const plansSnap = await getDocs(collection(db, "users", uid, "plans"));
  const favsSnap  = await getDocs(collection(db, "users", uid, "favorites"));

  document.getElementById("stat-plans").textContent    = plansSnap.size;
  document.getElementById("stat-favorites").textContent = favsSnap.size;

  // Last active
  let lastDate = null;
  plansSnap.forEach(d => {
    const t = d.data().createdAt?.toDate();
    if (t && (!lastDate || t > lastDate)) lastDate = t;
  });
  document.getElementById("stat-last").textContent =
    lastDate ? lastDate.toLocaleDateString("uk-UA") : "—";
}

// ---- Plans ----
async function loadPlans(uid) {
  const q    = query(collection(db, "users", uid, "plans"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const list = document.getElementById("plans-list");
  const empty = document.getElementById("plans-empty");
  list.innerHTML = "";

  if (snap.empty) { empty.style.display = "block"; return; }
  empty.style.display = "none";

  snap.forEach(docSnap => {
    const p    = docSnap.data();
    const date = p.createdAt?.toDate().toLocaleDateString("uk-UA") || "";
    const name = p.name || buildPlanName(p);

    const card = document.createElement("div");
    card.className = "ppc";
    card.dataset.id = docSnap.id;
    card.innerHTML = `
      <div class="ppc-left">
        <div class="ppc-name" data-field="name">${name}</div>
        <div class="ppc-meta">
          <span class="ppc-tag">${GOAL_LABELS[p.goal]  || p.goal}</span>
          <span class="ppc-tag">${LEVEL_LABELS[p.level] || p.level}</span>
          <span class="ppc-tag">${TYPE_LABELS[p.type]  || p.type}</span>
          <span class="ppc-tag">📅 ${p.days} дн/тижд.</span>
        </div>
        <div class="ppc-date">${date}</div>
      </div>
      <div class="ppc-actions">
        <button class="btn-ghost btn-sm btn-rename" title="Перейменувати">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8.5 1.5l3 3L4 12H1v-3L8.5 1.5z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="btn-ghost btn-sm btn-load" title="Завантажити план">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v8M3 6l3.5 3.5L10 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 11h11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          Завантажити
        </button>
        <button class="btn-ghost btn-sm btn-delete" title="Видалити">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3h9M5 3V2h3v1M4 3v7a1 1 0 001 1h3a1 1 0 001-1V3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>`;

    // Завантажити
    card.querySelector(".btn-load").addEventListener("click", () => {
      localStorage.setItem("fitforge_prefs", JSON.stringify(p));
      window.location.href = "plan.html";
    });

    // Видалити
    card.querySelector(".btn-delete").addEventListener("click", async () => {
      if (!confirm(`Видалити план "${name}"?`)) return;
      await deleteDoc(doc(db, "users", uid, "plans", docSnap.id));
      card.style.animation = "fadeOut 0.25s ease forwards";
      setTimeout(() => {
        card.remove();
        if (!list.children.length) empty.style.display = "block";
      }, 250);
      await loadStats(uid);
    });

    // Перейменувати
    card.querySelector(".btn-rename").addEventListener("click", () => {
      const nameEl  = card.querySelector(".ppc-name");
      const oldName = nameEl.textContent;
      nameEl.contentEditable = "true";
      nameEl.classList.add("editing");
      nameEl.focus();

      const finish = async () => {
        nameEl.contentEditable = "false";
        nameEl.classList.remove("editing");
        const newName = nameEl.textContent.trim() || oldName;
        nameEl.textContent = newName;
        if (newName !== oldName) {
          await updateDoc(doc(db, "users", uid, "plans", docSnap.id), { name: newName });
        }
      };
      nameEl.addEventListener("blur",    finish, { once: true });
      nameEl.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); nameEl.blur(); } }, { once: true });
    });

    list.appendChild(card);
  });
}

// ---- Favorites ----
async function loadFavorites(uid) {
  const snap  = await getDocs(collection(db, "users", uid, "favorites"));
  const list  = document.getElementById("favorites-list");
  const empty = document.getElementById("favorites-empty");
  list.innerHTML = "";

  if (snap.empty) { empty.style.display = "block"; return; }
  empty.style.display = "none";

  snap.forEach(docSnap => {
    const ex   = docSnap.data();
    const card = document.createElement("div");
    card.className = "fav-card";
    card.innerHTML = `
      <div class="fav-name">${ex.name}</div>
      <div class="fav-meta">
        ${ex.sets || "3"} підходи · ${ex.reps || "10–12"} повторень
        ${ex.muscle ? `<span class="fav-muscle">${ex.muscle}</span>` : ""}
      </div>
      <button class="fav-remove" title="Видалити з улюблених">♡</button>`;

    card.querySelector(".fav-remove").addEventListener("click", async () => {
      await deleteDoc(doc(db, "users", uid, "favorites", docSnap.id));
      card.style.animation = "fadeOut 0.25s ease forwards";
      setTimeout(() => {
        card.remove();
        if (!list.children.length) empty.style.display = "block";
      }, 250);
      await loadStats(uid);
    });

    list.appendChild(card);
  });
}

// ---- Rename user display name ----
document.getElementById("btn-edit-name")?.addEventListener("click", () => {
  const nameEl = document.getElementById("profile-name");
  nameEl.contentEditable = "true";
  nameEl.classList.add("editing");
  nameEl.focus();

  const finish = async () => {
    nameEl.contentEditable = "false";
    nameEl.classList.remove("editing");
    const newName = nameEl.textContent.trim();
    if (newName && newName !== currentUser.displayName) {
      await updateProfile(currentUser, { displayName: newName });
    }
  };
  nameEl.addEventListener("blur",    finish, { once: true });
  nameEl.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); nameEl.blur(); } }, { once: true });
});

// ---- Tab switching ----
document.querySelectorAll(".profile-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".profile-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.panel).classList.add("active");
  });
});

// ---- Logout ----
document.getElementById("btn-logout").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "auth.html";
});

// ---- Helpers ----
function buildPlanName(p) {
  return `${TYPE_LABELS[p.type] || p.type} · ${GOAL_LABELS[p.goal]?.replace(/^.\s/, "") || p.goal}`;
}
