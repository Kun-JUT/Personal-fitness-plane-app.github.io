// ===== FIREBASE.JS — спільна ініціалізація =====
// ВАЖЛИВО: замініть значення нижче на свої з Firebase Console
// Project Settings → Your apps → firebaseConfig

import { initializeApp }      from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyD71Jf3fEB0LPzYR4-D0ktdItK5WXbcCko",
  authDomain:        "fitforge-c8e54.firebaseapp.com",
  projectId:         "fitforge-c8e54",
  storageBucket:     "fitforge-c8e54.firebasestorage.app",
  messagingSenderId: "1092241300162",
  appId:             "1:1092241300162:web:1a1fedec2b96bb627d395b"
};

const app = initializeApp(firebaseConfig);

export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
