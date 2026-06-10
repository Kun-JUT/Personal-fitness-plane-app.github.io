// ===== AUTH.JS — реєстрація і вхід =====
import { auth, googleProvider } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ---- Якщо вже залогінений — одразу на форму ----
onAuthStateChanged(auth, user => {
  if (user) window.location.href = "form.html";
});

// ---- DOM refs ----
const emailEl    = document.getElementById("auth-email");
const passwordEl = document.getElementById("auth-password");
const nameEl     = document.getElementById("auth-name");
const nameWrap   = document.getElementById("auth-name-wrap");
const errorEl    = document.getElementById("auth-error");
const submitBtn  = document.getElementById("btn-submit");
const toggleBtn  = document.getElementById("auth-toggle");
const titleEl    = document.getElementById("auth-title");
const subtitleEl = document.getElementById("auth-subtitle");

let isLogin = true;

// ---- Google ----
document.getElementById("btn-google").addEventListener("click", async () => {
  clearError();
  try {
    await signInWithPopup(auth, googleProvider);
    // onAuthStateChanged зробить redirect
  } catch (e) {
    showError(firebaseErrorMessage(e.code));
  }
});

// ---- Email / пароль ----
submitBtn.addEventListener("click", async () => {
  clearError();
  const email    = emailEl.value.trim();
  const password = passwordEl.value;

  if (!email || !password) { showError("Заповніть всі поля"); return; }

  setLoading(true);
  try {
    if (isLogin) {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      const name = nameEl?.value.trim();
      if (!name) { showError("Введіть ім'я"); setLoading(false); return; }
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
    }
    // redirect відбудеться через onAuthStateChanged
  } catch (e) {
    showError(firebaseErrorMessage(e.code));
    setLoading(false);
  }
});

// ---- Перемикач Вхід / Реєстрація ----
toggleBtn.addEventListener("click", () => {
  isLogin = !isLogin;
  titleEl.textContent    = isLogin ? "Вхід"                        : "Реєстрація";
  subtitleEl.textContent = isLogin ? "Увійдіть до свого кабінету" : "Створіть акаунт FitForge";
  submitBtn.textContent  = isLogin ? "Увійти"                      : "Зареєструватись";
  toggleBtn.textContent  = isLogin ? "Немає акаунту? Зареєструватись" : "Вже є акаунт? Увійти";
  if (nameWrap) nameWrap.style.display = isLogin ? "none" : "flex";
  clearError();
});

// ---- Helpers ----
function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.opacity = "1";
}
function clearError() {
  errorEl.textContent = "";
  errorEl.style.opacity = "0";
}
function setLoading(on) {
  submitBtn.disabled = on;
  submitBtn.style.opacity = on ? "0.6" : "1";
}

function firebaseErrorMessage(code) {
  const map = {
    "auth/invalid-email":            "Невірний формат email",
    "auth/user-not-found":           "Акаунт не знайдено",
    "auth/wrong-password":           "Невірний пароль",
    "auth/email-already-in-use":     "Цей email вже зареєстрований",
    "auth/weak-password":            "Пароль занадто короткий (мін. 6 символів)",
    "auth/popup-closed-by-user":     "Вхід через Google скасовано",
    "auth/network-request-failed":   "Помилка мережі, спробуйте ще раз",
    "auth/invalid-credential":       "Невірний email або пароль",
  };
  return map[code] || "Щось пішло не так, спробуйте ще раз";
}
